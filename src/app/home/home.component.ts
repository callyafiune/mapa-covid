import { Component, OnInit } from '@angular/core';
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
  info;
  geojson;
  layerAnterior;
  sigla = 'GO';
  defaultZoom = 6;
  idMap = 'map';
  estados: any[] = [];
  grades = [0, 1, 2, 5, 10, 20, 50, 100];

  constructor(public mapaService: MapaService) { }

  ngOnInit() {
    this.carregarListaEstados();
    this.iniciar();
  }

  iniciar() {
    this.mapaService.obterCasosCovid(this.sigla)
      .subscribe((lista: any) => {
        if (lista.results[0]) {
          this.mapaService.dataAtualizacao = lista.results[0].date;
        }
        this.mapaService.casos = {};
        for (const item of lista.results) {
          if (item.city) {
            this.mapaService.casos[item.city] = item;
          }
        }
        this.carregarMapa();
      });
  }

  carregarListaEstados() {
    const keys = Object.keys(EnumEstado);
    for (const key of keys) {
      this.estados.push({sigla: EnumEstado[key], estado: key});
    }
  }

  alterarEstado() {
    this.iniciar();
  }

  carregarMapa() {
    this.reiniciarContainerMap();
    const geo = coordenadas[this.sigla];
    this.map = L.map(this.idMap).setView([geo[0], geo[1]], this.defaultZoom);

    this.inserirInfoRodape();
    this.inserirInformacaoCasos();
    this.inserirMunicipiosMapa();
    this.inserirLegendas();
  }

  reiniciarContainerMap() {
    if (this.map) {
      this.map.remove();
    }
    const container = L.DomUtil.get(this.idMap);
    if (container) {
      container._leaflet_id = undefined;
    }
  }

  inserirMunicipiosMapa() {
    const self = this;
    this.mapaService.obterGeoJson(this.sigla).subscribe((json: any) => {
      self.geojson = L.geoJSON(json, {
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
            mouseover: (e) => {
              self.selecionarMunicipio(e, self);
            },
            mouseout: (e) => {
              self.limparSelecaoMunicipio(e, self);
            },
            click: (e) => {
              if (self.layerAnterior) {
                self.limparSelecaoMunicipio(self.layerAnterior, self);
              }
              self.selecionarMunicipio(e, self);
              self.layerAnterior = e;
            },
            dblclick: (e) => {
              self.acionarZoom(e, self);
            }
          });
        }
      }).addTo(this.map);
    });
  }

  inserirInformacaoCasos() {
    const self = this;
    this.info = new L.Control();
    this.info.onAdd = function() {
      this._div = L.DomUtil.create('div', 'info');
      this.update();
      return this._div;
    };

    this.info.update = function(props) {
      if (!self.mapaService.casos) {
        return;
      }

      let valor = 0;
      let mortes = 0;
      if (props && props.name && self.mapaService.casos[props.name]) {
        valor = +self.mapaService.casos[props.name].confirmed;
        mortes = +self.mapaService.casos[props.name].deaths;
      }
      valor = valor ? valor : 0;
      mortes = mortes ? mortes : 0;
      let textInfo = 'Nenhuma informação disponível.';
      if (props) {
        textInfo = `<b>${props.name}</b><br />${valor} casos confirmados. `;
        let textDeath = `${mortes} mortes.`;
        if (mortes === 0) {
          textDeath = ' Nenhuma morte.';
        }
        if (mortes === 1) {
          textDeath = ' 1 morte.';
        }
        textInfo = textInfo + textDeath;

        if (valor === 0) {
          textInfo = `<b>${props.name}</b><br />Nenhum caso confirmado.`;
        }
      }

      this._div.innerHTML = `<h4>Informações de Casos COVID-19</h4>${textInfo}`;
    };

    this.info.addTo(this.map);
  }

  limparSelecaoMunicipio(e, self) {
    self.geojson.resetStyle(e.target);
    self.info.update();
  }

  acionarZoom(e, self) {
    self.map.fitBounds(e.target.getBounds());
  }

  selecionarMunicipio(e, self) {
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

    self.info.update(layer.feature.properties);
  }

  inserirLegendas() {
    const self = this;
    const legend = L.control({position: 'bottomright'});
    legend.onAdd = (map) => {
      const div = L.DomUtil.create('div', 'info legend');

      for (let i = 0; i < self.grades.length; i++) {
          div.innerHTML +=
              `<i style="background:${self.getColorByNumber(self.grades[i] + 1)}"></i>${self.grades[i]}` +
              (self.grades[i + 1] ? `&ndash;${self.grades[i + 1]}<br>` : '+');
      }
      return div;
    };
    legend.addTo(this.map);
  }

  getColor(item) {
    const nome = item.properties.name;
    let d = 0;
    if (this.mapaService.casos[nome]) {
      d = +this.mapaService.casos[nome].confirmed;
    }
    return this.getColorByNumber(d);
  }

  getColorByNumber(d: number) {
    d = d ? d : 0;
    return d > this.grades[7] ? '#800026' :
      d > this.grades[6] ? '#BD0026' :
      d > this.grades[5] ? '#E31A1C' :
      d > this.grades[4] ? '#FC4E2A' :
      d > this.grades[3] ? '#FD8D3C' :
      d > this.grades[2] ? '#FEB24C' :
      d > this.grades[1] ? '#FED976' :
      d > this.grades[0] ?  '#FFEDA0' :
      '#FFFAE6';
  }

  inserirInfoRodape() {
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      id: 'mapbox.light',
      attribution: `Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>
        contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>,
        Imagery © <a href="https://www.mapbox.com/">Mapbox</a>`
    }).addTo(this.map);
  }

}
