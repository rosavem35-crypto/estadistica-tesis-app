# estadistica-tesis-latam v1.0

Skill de Claude para analizar datos de tesis y artículos en español (APA 7): tabla + figura + párrafo de resultados + justificación del método, a partir de Excel, CSV o SPSS (.sav). Pensada para quien no domina SPSS, Jamovi o RStudio. **No incluye instrumentos ni validación de instrumentos.**

## Instalación
1. Requisitos: Python 3.9+ y `pip install pandas numpy scipy statsmodels matplotlib openpyxl python-docx pyreadstat` (pyreadstat solo para .sav).
2. Copia la carpeta como skill (el archivo `SKILL.md` define su uso) o ejecuta los scripts directamente.

## Prueba rápida
```bash
python3 ejemplos/ejemplo_completo.py                      # genera un informe con datos sintéticos
python3 scripts/tesis_stats.py comparar --datos ejemplos/datos_ejemplo.csv --y postest --grupo grupo
python3 -m pytest tests -q                                # 36 pruebas contra SciPy y statsmodels
```

## Contenido
- `SKILL.md` — instrucciones para Claude (flujo, reglas de honestidad, alcance).
- `scripts/` — módulos de cálculo y exportación (Word/Excel/Markdown).
- `references/` — árbol de decisión, justificación con citas, equivalencias SPSS/Jamovi/R, plantillas de redacción, límites.
- `ejemplos/` — datos sintéticos e informe de ejemplo.
- `tests/` — verificación numérica.

## Aviso
Código original; no copia código de otros repositorios. Los textos generados son un borrador de redacción: deben ser revisados por el investigador y su asesor. Úsalo solo con datos sin información que identifique a las personas.
