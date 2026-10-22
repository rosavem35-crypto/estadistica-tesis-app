# -*- coding: utf-8 -*-
"""Ejemplo de flujo completo con datos sintéticos. Ejecutar desde la carpeta raíz de la skill:
    python3 ejemplos/ejemplo_completo.py
Genera ejemplos/informe_ejemplo/informe.docx, tablas.xlsx, informe.md y las figuras PNG."""
import os
import sys
import warnings

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, "..", "scripts"))
from tesis_stats import *  # noqa

warnings.filterwarnings("ignore")
SAL = os.path.join(AQUI, "informe_ejemplo")
df = cargar_datos(os.path.join(AQUI, "datos_ejemplo.csv"))

inf = Informe("Informe de ejemplo (datos sintéticos)", salida=SAL)
inf.agregar(perfil_datos(df, salida=SAL))
inf.agregar(frecuencias(df, "sexo", salida=SAL))
inf.agregar(descriptivos(df, ["edad", "horas_estudio", "pretest", "postest"], por="grupo", salida=SAL))
inf.agregar(comparar_grupos(df, "postest", "grupo", salida=SAL))
inf.agregar(comparar_grupos(df, "postest", "facultad", salida=SAL))
inf.agregar(comparar_pareadas(df, "pretest", "postest", salida=SAL))
inf.agregar(matriz_correlaciones(df, ["edad", "horas_estudio", "ansiedad", "postest"], ajuste="holm", salida=SAL))
inf.agregar(chi_cuadrado(df, "sexo", "aprobado", salida=SAL))
inf.agregar(regresion_lineal(df, "postest", ["pretest", "horas_estudio", "ansiedad", "grupo"],
                             referencia={"grupo": "Control"}, salida=SAL))
inf.agregar(muestra_poblacion(N=1200, salida=SAL))
inf.agregar(potencia_muestra("t_independiente", efecto=0.5, salida=SAL))
print(inf.guardar())
