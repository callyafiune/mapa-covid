import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MapaService } from './mapa.service';

import * as L from 'leaflet';
import { EnumEstado } from './enum-estado';
import { coordenadas } from './enum-coordenadas';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  map;
  previousLayer;
  sigla = 'GO';
  estados: any[] = [];
  coordenate1 = -16.6;
  coordenate2 = -49.2;

  constructor(private http: HttpClient,
              public mapaService: MapaService) { }


  ngOnInit() {
    const keys = Object.keys(EnumEstado);
    for (const key of keys) {
      this.estados.push({sigla: EnumEstado[key], estado: key});
    }
    this.iniciarMapa();
  }

  alterarEstado() {
    this.iniciarMapa();
  }

  iniciarMapa() {
    this.mapaService.obterCasos(this.sigla)
      .subscribe((lista: any) => {
        this.mapaService.dataAtualizacao = lista.results[0].date;
        this.mapaService.casos = {};
        for (const item of lista.results) {
          if (item.city) {
            this.mapaService.casos[item.city] = +item.confirmed;
          }
        }
        this.carregarMapa();
      });
  }

  carregarMapa() {
    if (this.map) {
      this.map.remove();
    }
    let geojson;
    const self = this;
    const container = L.DomUtil.get('map');
    if (container) {
      container._leaflet_id = undefined;
    }
    const geo = coordenadas[this.sigla];
    this.map = L.map('map').setView([geo[0], geo[1]], 6);

    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      id: 'mapbox.light',
      attribution: `Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>
        contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>,
        Imagery © <a href="https://www.mapbox.com/">Mapbox</a>`
    }).addTo(this.map);

    let info;

    info = new L.Control();

    info.onAdd = function() {
      this._div = L.DomUtil.create('div', 'info');
      this.update();
      return this._div;
    };

    info.update = function(props) {
      if (!self.mapaService.casos) {
        return;
      }

      let valor = 0;
      if (props && props.name) {
        valor = +self.mapaService.casos[props.name];
      }
      valor = valor ? valor : 0;
      this._div.innerHTML = '<h4>Informações de Casos COVID-19</h4>' + (props ?
        '<b>' + props.name + '</b><br />' + valor + ' casos confirmados. '
        : 'Nenhuma informação disponível.');
    };

    info.addTo(this.map);

    function resetHighlight(e) {
      geojson.resetStyle(e.target);
      info.update();
    }

    function zoomToFeature(e) {
      this.map.fitBounds(e.target.getBounds());
    }

    function highlightFeature(e) {
      const layer = e.target;

      layer.setStyle({
        weight: 5,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.7
      });

      if (!L.Browser.ie && !L.Browser.edge) {
        layer.bringToFront();
      }

      info.update(layer.feature.properties);
    }
    const url = `assets/${this.sigla.toLocaleLowerCase()}/map.json`;
    this.http.get(url).subscribe((json: any) => {
      geojson = L.geoJSON(json, {
        style: (feature) => ({
          fillColor: this.getColor(feature),
          weight: 2,
          opacity: 1,
          color: 'white',
          dashArray: '3',
          fillOpacity: 0.7
        }),
        onEachFeature: function onEachFeature(feature, layer) {
          layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: (e) => {
              if (self.previousLayer) {
                resetHighlight(self.previousLayer);
              }
              highlightFeature(e);
              self.previousLayer = e;
            },
            dblclick: zoomToFeature
          });
        }
      }).addTo(this.map);
    });
  }

  getColor(item) {
    const nome = item.properties.name;
    const valor = this.mapaService.casos[nome];

    const d = valor ? +valor : 0;
    return d > 100 ? '#800026' :
      d > 50 ? '#BD0026' :
      d > 20 ? '#E31A1C' :
      d > 10 ? '#FC4E2A' :
      d > 5 ? '#FD8D3C' :
      d > 2 ? '#FEB24C' :
      d > 1 ? '#FED976' :
        '#FFEDA0';
  }

}
