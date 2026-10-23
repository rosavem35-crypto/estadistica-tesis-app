# -*- coding: utf-8 -*-
"""
ts_confiabilidad.py — Confiabilidad de escalas (alfa de Cronbach).

Alcance v1: alfa de Cronbach con IC 95% (Feldt, Woodruff y Salih, 1987),
correlación ítem-total corregida y "alfa si se elimina el ítem". No cubre
validación de instrumentos más allá de esto (AFE, AFC, validez de
contenido/criterio) — ver references/alcance_y_limites.md.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import stats

from ts_base import (ALFA, CAT, Resultado, _col, _slug, estilo_graficos, fnum, guardar_fig, mag_alfa, P,
                     plt, prep_df_numerico)


def _alfa_cronbach(datos: pd.DataFrame) -> tuple[float, int, int]:
    """alfa = (k/(k-1)) * (1 - Σvar_item / var_total). Requiere >=2 columnas, filas completas."""
    k = datos.shape[1]
    n = datos.shape[0]
    var_items = datos.var(ddof=1)
    var_total = datos.sum(axis=1).var(ddof=1)
    if var_total == 0:
        alfa = float("nan")
    else:
        alfa = (k / (k - 1)) * (1 - var_items.sum() / var_total)
    return float(alfa), n, k


def _ic_alfa(alfa: float, n: int, k: int, confianza: float = 1 - ALFA) -> tuple[float, float]:
    """IC del alfa de Cronbach (Feldt, Woodruff y Salih, 1987), vía la F con gl1=n-1, gl2=(n-1)(k-1)."""
    gl1, gl2 = n - 1, (n - 1) * (k - 1)
    cola = (1 - confianza) / 2
    lo = 1 - (1 - alfa) * stats.f.ppf(1 - cola, gl1, gl2)
    hi = 1 - (1 - alfa) * stats.f.ppf(cola, gl1, gl2)
    return float(lo), float(hi)


def confiabilidad_escala(df: pd.DataFrame, items: list, etiqueta_escala: str | None = None,
                         invertir: list | None = None, salida: str | None = None,
                         alfa: float = ALFA) -> Resultado:
    """
    Confiabilidad (alfa de Cronbach) de una escala formada por `items` (p. ej., ítems Likert).

    `invertir`: lista de ítems a invertir antes de calcular (p. ej., ítems redactados en
    sentido contrario a la escala). Se invierten con (máx. + mín.) − valor, usando el rango
    observado de cada ítem — ajusta la codificación de origen si tu escala usa otro rango.
    """
    cols = [_col(df, it) for it in items]
    if len(cols) < 2:
        raise ValueError("Se necesitan al menos 2 ítems para calcular la confiabilidad de una escala.")
    etiqueta = etiqueta_escala or "la escala"

    datos = prep_df_numerico(df, cols)
    n_original = len(datos)
    datos_completos = datos.dropna()
    n = len(datos_completos)
    if n < 2:
        raise ValueError("No hay suficientes casos completos (sin datos faltantes en los ítems) para calcular "
                         "la confiabilidad.")

    invertir = [_col(df, it) for it in (invertir or [])]
    for c in invertir:
        datos_completos[c] = (datos_completos[c].max() + datos_completos[c].min()) - datos_completos[c]

    k = len(cols)
    alfa_total, _, _ = _alfa_cronbach(datos_completos)
    lo, hi = _ic_alfa(alfa_total, n, k, confianza=1 - alfa)

    filas_item = []
    for c in cols:
        resto = datos_completos.drop(columns=[c]).sum(axis=1)
        r_it = float(np.corrcoef(datos_completos[c], resto)[0, 1]) if datos_completos[c].std(ddof=1) > 0 else float("nan")
        a_sin, _, _ = _alfa_cronbach(datos_completos.drop(columns=[c]))
        filas_item.append({"Ítem": c, "Correlación ítem-total corregida": r_it,
                           "Alfa si se elimina el ítem": a_sin})
    tabla_items = pd.DataFrame(filas_item)

    # k y n se guardan como str: una tabla 100% numérica pierde el tipo entero
    # al iterar fila por fila con df.iterrows() (pandas sube toda la fila a
    # float si no hay ninguna columna de texto) y _fmt_celda() los mostraría
    # como "5.00" en vez de "5".
    tabla_fiabilidad = pd.DataFrame([{
        "Alfa de Cronbach": alfa_total, "IC 95% inf.": lo, "IC 95% sup.": hi,
        "N° de ítems": str(k), "n": str(n),
    }])

    avisos = []
    if n_original - n > 0:
        avisos.append(f"Se excluyeron {n_original - n} caso(s) con datos faltantes en los ítems "
                      "(eliminación por lista).")
    for fila in filas_item:
        if fila["Correlación ítem-total corregida"] < 0:
            avisos.append(f"'{fila['Ítem']}' tiene correlación ítem-total negativa; considera invertir su "
                          "codificación (ver parámetro `invertir`) o revisar su redacción.")
    if n < 2 * k:
        avisos.append(f"La muestra (n = {n}) es pequeña en relación con el número de ítems (k = {k}); "
                      "interpreta el alfa con cautela.")

    estilo_graficos()
    fig, ax = plt.subplots(figsize=(5.4, max(2.0, 0.5 * k + 1.0)))
    ypos = np.arange(k)[::-1]
    valores = tabla_items["Correlación ítem-total corregida"].to_numpy()
    colores = [CAT[0] if v >= 0 else CAT[7] for v in valores]
    ax.barh(ypos, valores, color=colores, height=0.6)
    ax.axvline(0, color="#0b0b0b", linewidth=1)
    ax.set_yticks(ypos)
    ax.set_yticklabels(tabla_items["Ítem"])
    ax.set_xlabel("Correlación ítem-total corregida")
    ax.grid(axis="y", visible=False)
    figura = guardar_fig(fig, salida, f"confiabilidad_{_slug(etiqueta)}")

    mag = mag_alfa(alfa_total)
    parrafo = (f"Se evaluó la confiabilidad de {etiqueta} ({k} ítems, n = {n}) mediante el coeficiente alfa de "
              f"Cronbach, α = {fnum(alfa_total, 2, True)}, IC 95% [{fnum(lo, 2, True)}, {fnum(hi, 2, True)}], "
              f"lo que indica una confiabilidad {mag}.")
    metodo = (f"Se evaluó la confiabilidad interna de {etiqueta} mediante el coeficiente alfa de Cronbach "
             "(Cronbach, 1951), con su intervalo de confianza al 95%. La interpretación siguió los criterios "
             "convencionales de George y Mallery (2003): < .50 inaceptable, .50-.60 pobre, .60-.70 cuestionable, "
             ".70-.80 aceptable, .80-.90 buena, > .90 excelente.")

    res = Resultado(id="confiabilidad_" + _slug(etiqueta), titulo=f"Confiabilidad de {etiqueta}",
                    prueba="Alfa de Cronbach",
                    tablas={"Estadísticos de fiabilidad": tabla_fiabilidad,
                            "Estadísticos de ítem-total": tabla_items},
                    figuras=[figura], pies_figura=["Correlación ítem-total corregida por ítem"],
                    parrafo=parrafo, metodo=metodo, avisos=avisos)
    res.datos = dict(alfa=alfa_total, ic95=(lo, hi), k=k, n=n, items=cols,
                     correlaciones_item_total=dict(zip(tabla_items["Ítem"], tabla_items["Correlación ítem-total corregida"])))
    return res
