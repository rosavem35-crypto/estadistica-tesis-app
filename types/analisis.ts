export type TipoAnalisis =
  | 'perfil_datos'
  | 'descriptivos'
  | 'frecuencias'
  | 'comparar_grupos'
  | 'comparar_pareadas'
  | 'correlacion'
  | 'matriz_correlaciones'
  | 'chi_cuadrado'
  | 'regresion_lineal'
  | 'regresion_logistica'
  | 'muestra_poblacion'
  | 'potencia_muestra'
  | 'confiabilidad';

export interface PerfilColumna {
  nombre: string;
  tipoDetectado: string;
  nValido: number;
  pctFaltante: number;
}

export type EstadoAnalisis = 'pendiente' | 'procesando' | 'completado' | 'error';
