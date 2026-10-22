# -*- coding: utf-8 -*-
"""
ts_muestra.py — Tamaño de muestra: (1) fórmula para poblaciones finitas/infinitas (encuestas, estimación de
proporciones) y (2) análisis de potencia a priori para pruebas de hipótesis.

OJO conceptual (se avisa en el resultado): son dos preguntas distintas.
  - "¿Cuántos encuestar para ESTIMAR una proporción con cierto error?"  -> muestra_poblacion()
  - "¿Cuántos necesito para DETECTAR un efecto con potencia 80%?"       -> potencia_muestra()
"""
from __future__ import annotations

import math

import numpy as np
import pandas as pd
from scipy import stats

from ts_base import ALFA, Resultado, fnum


def n_poblacion(N=None, confianza: float = 0.95, error: float = 0.05, p: float = 0.5) -> dict:
    z = float(stats.norm.ppf(1 - (1 - confianza) / 2))
    q = 1 - p
    n0 = z ** 2 * p * q / error ** 2
    n = n0 if not N else (N * z ** 2 * p * q) / (error ** 2 * (N - 1) + z ** 2 * p * q)
    return dict(z=z, n0=n0, n=int(math.ceil(n)))


def muestra_poblacion(N=None, confianza: float = 0.95, error: float = 0.05, p: float = 0.5, salida=None) -> Resultado:
    """Tamaño de muestra para estimar una proporción. N=None → población infinita."""
    if not (0 < confianza < 1) or not (0 < error < 1) or not (0 < p < 1):
        raise ValueError("confianza, error y p deben estar entre 0 y 1 (ejemplo: 0.95, 0.05, 0.5).")
    if N is not None and N < 2:
        raise ValueError("N (tamaño de la población) debe ser mayor que 1.")
    r = n_poblacion(N, confianza, error, p)
    filas = [{"Parámetro": "Nivel de confianza", "Valor": f"{fnum(100 * confianza, 0)}%"},
             {"Parámetro": "Valor Z", "Valor": fnum(r["z"], 2)},
             {"Parámetro": "Margen de error (e)", "Valor": f"{fnum(100 * error, 1)}%"},
             {"Parámetro": "Proporción esperada (p)", "Valor": fnum(p, 2)},
             {"Parámetro": "q = 1 − p", "Valor": fnum(1 - p, 2)},
             {"Parámetro": "Población (N)", "Valor": str(N) if N else "desconocida / infinita"},
             {"Parámetro": "Tamaño de muestra (n)", "Valor": str(r["n"])}]
    formula = ("n = Z²·p·q / e²" if not N else "n = N·Z²·p·q / [e²·(N − 1) + Z²·p·q]")
    parrafo = (f"Para determinar el tamaño de la muestra se utilizó la fórmula para estimar proporciones en "
               f"poblaciones {'finitas' if N else 'infinitas'} ({formula}), con un nivel de confianza del "
               f"{fnum(100 * confianza, 0)}% (*Z* = {fnum(r['z'], 2)}), un margen de error del {fnum(100 * error, 1)}%, una "
               f"proporción esperada *p* = {fnum(p, 2)} (*q* = {fnum(1 - p, 2)})"
               + (f" y una población de *N* = {N}" if N else "") + f". El resultado fue una muestra de *n* = {r['n']} participantes.")
    avisos = ["Esta fórmula sirve para ESTIMAR proporciones en encuestas (muestreo probabilístico). No es un análisis de potencia: "
              "si tu objetivo es contrastar hipótesis (comparar grupos, correlacionar), usa potencia_muestra().",
              "Si no tienes información previa sobre p, usar p = 0.5 da el mayor tamaño de muestra (caso más conservador).",
              "Agrega a n un porcentaje por posibles no respuestas (por ejemplo, 10%) si tu diseño lo requiere."]
    res = Resultado(id="muestra_poblacion", titulo="Tamaño de muestra (estimación de proporciones)",
                    prueba=f"Fórmula de muestreo para población {'finita' if N else 'infinita'} (Cochran, 1977)",
                    tablas={"Cálculo del tamaño de muestra": pd.DataFrame(filas)}, parrafo=parrafo,
                    metodo=parrafo, avisos=avisos)
    res.datos = r
    return res


# ---------------------------------------------------------------------------
def _n_por_ncf(f2: float, k_num: int, alfa: float, potencia: float, resta: int) -> int:
    """Menor N con potencia ≥ objetivo para un test F con λ = f²·N, gl1 = k_num, gl2 = N − resta (como G*Power)."""
    for N in range(resta + 2, 200000):
        gl2 = N - resta
        fc = stats.f.ppf(1 - alfa, k_num, gl2)
        pot = 1 - stats.ncf.cdf(fc, k_num, gl2, f2 * N)
        if pot >= potencia:
            return N
    raise ValueError("No se encontró un tamaño de muestra razonable (efecto demasiado pequeño).")


def n_potencia(prueba: str, efecto: float, alfa: float = ALFA, potencia: float = 0.80, k: int = 3, gl: int = 1,
               predictores: int = 3, bilateral: bool = True) -> dict:
    alt = "two-sided" if bilateral else "larger"
    if prueba == "t_independiente":
        from statsmodels.stats.power import TTestIndPower
        n1 = TTestIndPower().solve_power(effect_size=efecto, alpha=alfa, power=potencia, ratio=1.0, alternative=alt)
        n = int(math.ceil(n1))
        return dict(por_grupo=n, total=2 * n, unidad="participantes por grupo")
    if prueba == "t_pareada":
        from statsmodels.stats.power import TTestPower
        n = int(math.ceil(TTestPower().solve_power(effect_size=efecto, alpha=alfa, power=potencia, alternative=alt)))
        return dict(por_grupo=n, total=n, unidad="pares de observaciones")
    if prueba == "anova":
        N = _n_por_ncf(efecto ** 2, k - 1, alfa, potencia, k)
        pg = int(math.ceil(N / k))
        return dict(por_grupo=pg, total=pg * k, unidad="participantes por grupo")
    if prueba == "regresion":
        N = _n_por_ncf(efecto, predictores, alfa, potencia, predictores + 1)
        return dict(por_grupo=N, total=N, unidad="casos")
    if prueba == "correlacion":
        za = stats.norm.ppf(1 - alfa / (2 if bilateral else 1))
        zb = stats.norm.ppf(potencia)
        n = int(math.ceil(((za + zb) / math.atanh(efecto)) ** 2 + 3))
        return dict(por_grupo=n, total=n, unidad="casos")
    if prueba == "chi2":
        from statsmodels.stats.power import GofChisquarePower
        n = int(math.ceil(GofChisquarePower().solve_power(effect_size=efecto, alpha=alfa, power=potencia, n_bins=gl + 1)))
        return dict(por_grupo=n, total=n, unidad="casos")
    raise ValueError("Prueba no reconocida. Opciones: t_independiente, t_pareada, anova, regresion, correlacion, chi2.")


_DEFECTO = {"t_independiente": (0.5, "d de Cohen"), "t_pareada": (0.5, "d_z de Cohen"), "anova": (0.25, "f de Cohen"),
            "regresion": (0.15, "f² de Cohen"), "correlacion": (0.30, "r"), "chi2": (0.30, "w de Cohen")}
_NOMBRE = {"t_independiente": "una comparación de dos grupos independientes (t de Student)",
           "t_pareada": "una comparación de dos mediciones relacionadas (t pareada)",
           "anova": "un ANOVA de un factor", "regresion": "una regresión lineal múltiple",
           "correlacion": "una correlación de Pearson", "chi2": "una prueba chi cuadrado de independencia"}


def potencia_muestra(prueba: str, efecto=None, alfa: float = ALFA, potencia: float = 0.80, k: int = 3, gl: int = 1,
                     predictores: int = 3, bilateral: bool = True, salida=None) -> Resultado:
    """Análisis de potencia a priori: tamaño de muestra necesario para detectar un efecto dado."""
    if prueba not in _DEFECTO:
        raise ValueError("Prueba no reconocida. Opciones: " + ", ".join(_DEFECTO))
    avisos = []
    nombre_ef = _DEFECTO[prueba][1]
    if efecto is None:
        efecto = _DEFECTO[prueba][0]
        avisos.append(f"No indicaste el tamaño del efecto: usé el valor MEDIANO convencional de Cohen ({nombre_ef} = {efecto}). "
                      "Lo ideal es justificarlo con la literatura o con un estudio piloto; los valores convencionales son un último recurso.")
    if efecto <= 0:
        raise ValueError("El tamaño del efecto debe ser mayor que 0.")
    if prueba == "correlacion" and efecto >= 1:
        raise ValueError("Para correlación, el efecto (r) debe estar entre 0 y 1.")
    r = n_potencia(prueba, efecto, alfa, potencia, k, gl, predictores, bilateral)
    extra = {"anova": f", {k} grupos", "chi2": f", gl = {gl}", "regresion": f", {predictores} predictores"}.get(prueba, "")
    filas = [{"Parámetro": "Prueba", "Valor": _NOMBRE[prueba].split(" ", 1)[1] + extra},
             {"Parámetro": f"Tamaño del efecto ({nombre_ef})", "Valor": fnum(efecto, 2)},
             {"Parámetro": "Nivel de significancia (α)", "Valor": fnum(alfa, 2, True)},
             {"Parámetro": "Potencia (1 − β)", "Valor": fnum(potencia, 2, True)},
             {"Parámetro": "Contraste", "Valor": "bilateral" if bilateral else "unilateral"},
             {"Parámetro": f"Tamaño de muestra necesario ({r['unidad']})", "Valor": str(r["por_grupo"])},
             {"Parámetro": "Tamaño de muestra total", "Valor": str(r["total"])}]
    parrafo = (f"Se realizó un análisis de potencia a priori para {_NOMBRE[prueba]}{extra}, con un tamaño del efecto "
               f"esperado {nombre_ef} = {fnum(efecto, 2)}, un nivel de significancia α = {fnum(alfa, 2, True)} y una potencia "
               f"estadística de {fnum(potencia, 2, True)} (contraste {'bilateral' if bilateral else 'unilateral'}). "
               f"Se requiere una muestra de {r['por_grupo']} {r['unidad']}"
               + (f" (total = {r['total']})" if r["total"] != r["por_grupo"] else "") + ".")
    if prueba == "correlacion":
        avisos.append("Cálculo con la aproximación de Fisher; G*Power (método exacto) puede dar 1 caso menos.")
    avisos.append("Añade un margen por posibles abandonos o datos faltantes (por ejemplo, 10–15%).")
    res = Resultado(id=f"potencia_{prueba}", titulo="Tamaño de muestra por análisis de potencia", prueba="Análisis de potencia a priori",
                    tablas={"Cálculo de la potencia": pd.DataFrame(filas)}, parrafo=parrafo,
                    metodo=parrafo + " El cálculo se realizó con Python (SciPy y statsmodels).", avisos=avisos)
    res.datos = dict(r, efecto=efecto)
    return res
