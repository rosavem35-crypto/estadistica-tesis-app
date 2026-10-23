import type { TipoAnalisis } from '@/types/analisis';

/**
 * Representación tipada de skill/estadistica-tesis-latam/references/arbol_decision.md
 * — se mantiene a mano en sincronía con ese archivo (no se genera
 * automáticamente). Dirige el asistente "elegir análisis" y el formulario
 * genérico de parámetros de la Fase 2; la Fase 4 reemplaza el formulario
 * genérico por componentes dedicados por tipo de análisis.
 */
export interface CampoParametro {
  /** Clave que se manda tal cual en `parametros` al motor. */
  nombre: string;
  etiqueta: string;
  tipo: 'columna' | 'columnas' | 'texto' | 'numero' | 'booleano';
  requerido: boolean;
  ayuda?: string;
}

export interface DefinicionAnalisis {
  tipo: TipoAnalisis;
  etiqueta: string;
  /** Pregunta del árbol de decisión que lleva a este análisis. */
  pregunta: string;
  campos: CampoParametro[];
  /** Agrupa el "elegir análisis" en secciones, mismo orden que arbol_decision.md. */
  categoria: 'diagnostico' | 'comparar' | 'relacionar' | 'predecir' | 'planificar';
  /**
   * false para muestra_poblacion y potencia_muestra: son cálculos de
   * planificación que no necesitan datos (ver SKILL.md), así que no deben
   * pedir ni usar un archivo subido.
   */
  requiereArchivo: boolean;
}

export const ETIQUETAS_CATEGORIA: Record<DefinicionAnalisis['categoria'], string> = {
  diagnostico: 'Conocer mis datos',
  comparar: 'Comparar grupos o momentos',
  relacionar: 'Relación entre variables',
  predecir: 'Predecir un resultado',
  planificar: 'Planificar una muestra (sin datos)',
};

export const ANALISIS_DISPONIBLES: DefinicionAnalisis[] = [
  {
    tipo: 'confiabilidad',
    etiqueta: 'Confiabilidad de una escala (alfa de Cronbach)',
    pregunta: '¿Necesitas evaluar la confiabilidad de una escala (p. ej., Likert) antes de analizarla?',
    categoria: 'diagnostico',
    requiereArchivo: true,
    campos: [
      { nombre: 'items', etiqueta: 'Ítems de la escala', tipo: 'columnas', requerido: true },
      { nombre: 'etiqueta_escala', etiqueta: 'Nombre de la escala', tipo: 'texto', requerido: false },
    ],
  },
  {
    tipo: 'descriptivos',
    etiqueta: 'Estadísticos descriptivos',
    pregunta: '¿Cómo es mi muestra?',
    categoria: 'diagnostico',
    requiereArchivo: true,
    campos: [
      { nombre: 'vars', etiqueta: 'Variables', tipo: 'columnas', requerido: true },
      { nombre: 'por', etiqueta: 'Agrupar por (opcional)', tipo: 'columna', requerido: false },
    ],
  },
  {
    tipo: 'frecuencias',
    etiqueta: 'Distribución de frecuencias',
    pregunta: '¿Cómo se distribuye una variable categórica?',
    categoria: 'diagnostico',
    requiereArchivo: true,
    campos: [{ nombre: 'var', etiqueta: 'Variable', tipo: 'columna', requerido: true }],
  },
  {
    tipo: 'comparar_grupos',
    etiqueta: 'Comparar 2 o más grupos',
    pregunta: '¿Dos o más grupos difieren en una variable numérica?',
    categoria: 'comparar',
    requiereArchivo: true,
    campos: [
      { nombre: 'y', etiqueta: 'Variable numérica', tipo: 'columna', requerido: true },
      { nombre: 'grupo', etiqueta: 'Variable de grupo', tipo: 'columna', requerido: true },
    ],
  },
  {
    tipo: 'comparar_pareadas',
    etiqueta: 'Comparar antes y después (pareadas)',
    pregunta: '¿Cambió algo entre antes y después en los mismos participantes?',
    categoria: 'comparar',
    requiereArchivo: true,
    campos: [
      { nombre: 'pre', etiqueta: 'Medición inicial', tipo: 'columna', requerido: true },
      { nombre: 'post', etiqueta: 'Medición final', tipo: 'columna', requerido: true },
    ],
  },
  {
    tipo: 'correlacion',
    etiqueta: 'Correlación entre 2 variables',
    pregunta: '¿Dos variables numéricas se relacionan?',
    categoria: 'relacionar',
    requiereArchivo: true,
    campos: [
      { nombre: 'x', etiqueta: 'Variable 1', tipo: 'columna', requerido: true },
      { nombre: 'y', etiqueta: 'Variable 2', tipo: 'columna', requerido: true },
    ],
  },
  {
    tipo: 'matriz_correlaciones',
    etiqueta: 'Matriz de correlaciones (3+ variables)',
    pregunta: '¿Varias variables se relacionan entre sí?',
    categoria: 'relacionar',
    requiereArchivo: true,
    campos: [{ nombre: 'vars', etiqueta: 'Variables (3 o más)', tipo: 'columnas', requerido: true }],
  },
  {
    tipo: 'chi_cuadrado',
    etiqueta: 'Asociación entre 2 variables categóricas',
    pregunta: '¿Dos variables categóricas se asocian?',
    categoria: 'relacionar',
    requiereArchivo: true,
    campos: [
      { nombre: 'x', etiqueta: 'Variable categórica 1', tipo: 'columna', requerido: true },
      { nombre: 'y', etiqueta: 'Variable categórica 2', tipo: 'columna', requerido: true },
    ],
  },
  {
    tipo: 'regresion_lineal',
    etiqueta: 'Regresión lineal múltiple',
    pregunta: '¿Qué predice un puntaje numérico?',
    categoria: 'predecir',
    requiereArchivo: true,
    campos: [
      { nombre: 'y', etiqueta: 'Variable a predecir', tipo: 'columna', requerido: true },
      { nombre: 'x', etiqueta: 'Predictores', tipo: 'columnas', requerido: true },
    ],
  },
  {
    tipo: 'regresion_logistica',
    etiqueta: 'Regresión logística binaria',
    pregunta: '¿Qué predice un sí/no?',
    categoria: 'predecir',
    requiereArchivo: true,
    campos: [
      { nombre: 'y', etiqueta: 'Variable binaria a predecir', tipo: 'columna', requerido: true },
      { nombre: 'x', etiqueta: 'Predictores', tipo: 'columnas', requerido: true },
    ],
  },
  {
    tipo: 'muestra_poblacion',
    etiqueta: 'Tamaño de muestra (encuesta)',
    pregunta: '¿Cuántos participantes necesito para una encuesta?',
    categoria: 'planificar',
    requiereArchivo: false,
    campos: [{ nombre: 'N', etiqueta: 'Tamaño de la población', tipo: 'numero', requerido: true }],
  },
  {
    tipo: 'potencia_muestra',
    etiqueta: 'Tamaño de muestra (análisis de potencia)',
    pregunta: '¿Cuántos participantes necesito para contrastar una hipótesis?',
    categoria: 'planificar',
    requiereArchivo: false,
    campos: [
      {
        nombre: 'prueba',
        etiqueta: 'Tipo de prueba',
        tipo: 'texto',
        requerido: true,
        ayuda: 't_independiente, t_pareada, anova, regresion, correlacion o chi2',
      },
    ],
  },
];

export function definicionDe(tipo: TipoAnalisis): DefinicionAnalisis {
  const def = ANALISIS_DISPONIBLES.find((d) => d.tipo === tipo);
  if (!def) throw new Error(`Tipo de análisis desconocido: ${tipo}`);
  return def;
}
