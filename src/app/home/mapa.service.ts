import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable()
export class MapaService {
    casos: any;
    dataAtualizacao: Date;

    constructor(private http: HttpClient) { }

    public obterCasosCovid(sigla: string): Observable<any> {
        return this.http.get<any>(`${environment.BRASIL_IO_API}/caso/data?state=${sigla}&is_last=True`);
    }

    public obterGeoJson(sigla: string) {
        return this.http.get<any>(`assets/${sigla.toLocaleLowerCase()}/map.json`);
    }
}
