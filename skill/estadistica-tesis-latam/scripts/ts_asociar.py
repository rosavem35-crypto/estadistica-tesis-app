# -*- coding: utf-8 -*-
"""
ts_asociar.py — Asociación entre variables: correlación (Pearson/Spearman), matriz de correlaciones
y chi cuadrado / Fisher con V de Cramér.
"""
from __future__ import annotations

import math

import numpy as np
import pandas as pd
from scipy import stats

from ts_base import (ALFA, CAT, EJE, MUDO, NEUTRO, TINTA, TINTA2, Resultado, _col, _etq, _niveles, _numerica,
                     _slug, decision_txt, estilo_graficos, fnum, fp_valor, guardar_fig, mag_r, mag_v, fuerza_r, P,
                     p_norm_txt, test_normalidad, plt)

# ============================================================================
# CORRELACIÓN
# ============================================================================


def coef_correlacion(x, y, metodo: str) -> dict:
    """Pearson (IC por transformación z de Fisher) o Spearman (IC de Bonett y Wright, 2000)."""
    x, y = np.asarray(x, float), np.asarray(y, float)
    n = len(x)
    if metodo == "pearson":
        r, p = stats.pearsonr(x, y)
        se = 1 / math.sqrt(n - 3)
    else:
        r, p = stats.spearmanr(x, y)
        se = math.sqrt((1 + r ** 2 / 2) / (n - 3))
    r, p = float(r), float(p)
    if abs(r) >= 1:
        lo = hi = r
    else:
        z = math.atanh(r)
        zc = stats.norm.ppf(0.975)
        lo, hi = math.tanh(z - zc * se), math.tanh(z + zc * se)
    return dict(r=r, p=p, n=n, ic=(lo, hi))


def correlacion(df, x, y, ordinal: bool = False, metodo: str = "auto", normalidad: str = "auto",
                h0=None, h1=None, salida=None, alfa: float = ALFA) -> Resultado:
    """Correlación entre dos variables. Pearson si ambas son normales; si no, Spearman."""
    x, y = _col(df, x), _col(df, y)
    d = pd.DataFrame({x: _numerica(df, x), y: _numerica(df, y)})
    excl = int(d.isna().any(axis=1).sum())
    d = d.dropna()
    n = len(d)
    if n < 4:
        raise ValueError(f"Solo hay {n} casos completos; se necesitan al menos 4 (idealmente 30 o más).")
    if d[x].nunique() < 2 or d[y].nunique() < 2:
        raise ValueError("Una de las variables es constante: no se puede calcular una correlación.")
    avisos = []
    if excl:
        avisos.append(f"Se excluyeron {excl} caso(s) con dato faltante (eliminación por pares).")
    if n < 30:
        avisos.append(f"n = {n} (< 30): la correlación es inestable con muestras pequeñas.")
    nx, ny = test_normalidad(d[x], normalidad), test_normalidad(d[y], normalidad)
    supuestos = [f"Normalidad de {x} ({nx['prueba']}): {p_norm_txt(nx)}" + (" → normal" if nx["normal"] else " → no normal"),
                 f"Normalidad de {y} ({ny['prueba']}): {p_norm_txt(ny)}" + (" → normal" if ny["normal"] else " → no normal")]
    if metodo == "auto":
        metodo = "pearson" if (not ordinal and nx["normal"] and ny["normal"]) else "spearman"
    if ordinal:
        supuestos.append("Variable declarada ordinal: se usa Spearman.")
    c = coef_correlacion(d[x], d[y], metodo)
    r, p = c["r"], c["p"]
    sig = p < alfa
    nombre = "r de Pearson" if metodo == "pearson" else "rho (ρ) de Spearman"
    simbolo = "*r*" if metodo == "pearson" else "*ρ*"
    sentido = "positiva" if r > 0 else "negativa"
    h0 = h0 or f"No existe relación estadísticamente significativa entre {x} y {y}."
    h1 = h1 or f"Existe relación estadísticamente significativa entre {x} y {y}."
    decision = decision_txt(p, alfa)
    tabla = pd.DataFrame([{"Variables": f"{x} – {y}", "Coeficiente": nombre,
                           ("r" if metodo == "pearson" else "ρ"): r, "n": n, "p": p,
                           "IC 95% inf. (r)": c["ic"][0], "IC 95% sup. (r)": c["ic"][1]}])
    if metodo == "pearson":
        tabla["R² (varianza compartida)"] = r ** 2
    if sig:
        parrafo = (f"Se encontró una correlación {sentido} {fuerza_r(r)} y estadísticamente significativa entre "
                   f"{x} y {y}, {simbolo}({n - 2}) = {fnum(r, 2, True)}, {P(p)}, IC 95% [{fnum(c['ic'][0], 2, True)}, "
                   f"{fnum(c['ic'][1], 2, True)}] (coeficiente {nombre}; *n* = {n})")
        if metodo == "pearson":
            parrafo += f", con {fnum(100 * r ** 2, 1)}% de varianza compartida (*r*² = {fnum(r ** 2, 2, True)})"
        parrafo += (f". A mayores valores de {x} tienden a corresponder "
                    f"{'mayores' if r > 0 else 'menores'} valores de {y}. Por tanto, se rechaza la hipótesis nula.")
    else:
        parrafo = (f"No se encontró una correlación estadísticamente significativa entre {x} y {y}, "
                   f"{simbolo}({n - 2}) = {fnum(r, 2, True)}, {P(p)}, IC 95% [{fnum(c['ic'][0], 2, True)}, "
                   f"{fnum(c['ic'][1], 2, True)}] (*n* = {n}). Por tanto, no se rechaza la hipótesis nula: no hay "
                   "evidencia suficiente de relación entre las variables.")
    razon = ("ambas variables cumplieron el supuesto de normalidad" if metodo == "pearson" else
             ("la variable es de naturaleza ordinal" if ordinal else
              "al menos una de las variables no cumplió el supuesto de normalidad"))
    metodo_txt = (f"Se evaluó la normalidad de ambas variables mediante la prueba de {nx['prueba']}. Dado que {razon}, "
                  f"se utilizó el coeficiente de correlación {nombre}"
                  f", con intervalo de confianza al 95%{' (transformación z de Fisher)' if metodo == 'pearson' else ' (método de Bonett y Wright, 2000)'}. "
                  f"Para interpretar la magnitud se siguieron los criterios de Cohen (1988): .10 pequeña, .30 mediana, "
                  f".50 grande. Nivel de significancia α = {fnum(alfa, 2, True)}.")
    # figura
    estilo_graficos()
    fig, ax = plt.subplots(figsize=(4.6, 4.2))
    ax.scatter(d[x], d[y], s=22, color=CAT[0], alpha=0.6, edgecolors="white", linewidths=0.5, zorder=3)
    pend, inter = np.polyfit(d[x], d[y], 1)
    xs = np.linspace(d[x].min(), d[x].max(), 50)
    ax.plot(xs, pend * xs + inter, color=TINTA, linewidth=1.6, zorder=4)
    ax.set_xlabel(x)
    ax.set_ylabel(y)
    ax.grid(axis="x", visible=True)
    ax.text(0.03, 0.97, f"{'r' if metodo == 'pearson' else 'ρ'} = {fnum(r, 2, True)}", transform=ax.transAxes,
            va="top", fontsize=9.5, color=TINTA2)
    figura = guardar_fig(fig, salida, f"correlacion_{_slug(x)}_{_slug(y)}")
    res = Resultado(id=f"correlacion_{_slug(x)}_{_slug(y)}", titulo=f"Correlación entre {x} y {y}",
                    prueba=f"Correlación {nombre}", h0=h0, h1=h1, decision=decision,
                    tablas={"Correlación": tabla},
                    notas_tabla={"Correlación": "Nota. IC = intervalo de confianza al 95%."},
                    figuras=[figura], pies_figura=[f"Relación entre {x} y {y} (línea de tendencia lineal referencial)"],
                    parrafo=parrafo, metodo=metodo_txt, supuestos=supuestos, avisos=avisos)
    res.datos = dict(r=r, p=p, n=n, metodo=metodo, ic=c["ic"])
    return res


def _estrellas(p: float) -> str:
    return "***" if p < .001 else "**" if p < .01 else "*" if p < .05 else ""


def matriz_correlaciones(df, variables, metodo: str = "auto", ordinal: bool = False, ajuste: str = "ninguno",
                         normalidad: str = "auto", salida=None, alfa: float = ALFA) -> Resultado:
    """Matriz de correlaciones con un solo método para todas (Pearson si TODAS son normales; si no, Spearman)."""
    vs = [_col(df, v) for v in variables]
    if len(vs) < 3:
        raise ValueError("Para una matriz indica al menos 3 variables (para 2 usa correlacion()).")
    D = pd.concat([_numerica(df, v).rename(v) for v in vs], axis=1)
    norm = {v: test_normalidad(D[v], normalidad) for v in vs}
    if metodo == "auto":
        metodo = "pearson" if (not ordinal and all(r["normal"] is True for r in norm.values())) else "spearman"
    k = len(vs)
    R = np.full((k, k), np.nan)
    Pm = np.full((k, k), np.nan)
    N = np.zeros((k, k), int)
    for i in range(k):
        R[i, i], Pm[i, i], N[i, i] = 1.0, np.nan, int(D[vs[i]].notna().sum())
        for j in range(i + 1, k):
            par = D[[vs[i], vs[j]]].dropna()
            if len(par) >= 4 and par.iloc[:, 0].nunique() > 1 and par.iloc[:, 1].nunique() > 1:
                c = coef_correlacion(par.iloc[:, 0], par.iloc[:, 1], metodo)
                R[i, j] = R[j, i] = c["r"]
                Pm[i, j] = Pm[j, i] = c["p"]
            N[i, j] = N[j, i] = len(par)
    # ajuste por comparaciones múltiples
    padj = Pm.copy()
    avisos = []
    iu = np.triu_indices(k, 1)
    if ajuste != "ninguno":
        from statsmodels.stats.multitest import multipletests
        ok = ~np.isnan(Pm[iu])
        ajust = multipletests(Pm[iu][ok], method={"bonferroni": "bonferroni", "holm": "holm"}[ajuste])[1]
        tmp = np.full(len(iu[0]), np.nan)
        tmp[ok] = ajust
        padj[iu] = tmp
        padj[(iu[1], iu[0])] = tmp
    else:
        avisos.append(f"Se hicieron {len(iu[0])} correlaciones sin ajuste: con tantas pruebas aumenta el riesgo de "
                      "falsos positivos. Considera ajuste='holm' o 'bonferroni' y repórtalo.")
    if any(r["normal"] is not True for r in norm.values()) and metodo == "pearson":
        avisos.append("Se forzó Pearson aunque alguna variable no es normal.")
    # tabla APA (triángulo inferior con estrellas)
    simb = "r" if metodo == "pearson" else "ρ"
    filas = []
    for i in range(k):
        f = {"Variable": f"{i + 1}. {vs[i]}"}
        for j in range(k - 1):
            if j < i:
                f[str(j + 1)] = (fnum(R[i, j], 2, True) + _estrellas(padj[i, j])) if not np.isnan(R[i, j]) else "—"
            elif i == j:
                f[str(j + 1)] = "—"
            else:
                f[str(j + 1)] = ""
        filas.append(f)
    t_apa = pd.DataFrame(filas)
    pares = []
    for i, j in zip(*iu):
        if not np.isnan(R[i, j]):
            pares.append({"Par": f"{vs[i]} – {vs[j]}", simb: R[i, j], "n": int(N[i, j]),
                          "p": Pm[i, j], **({"p ajustada": padj[i, j]} if ajuste != "ninguno" else {})})
    t_pares = pd.DataFrame(pares)
    pcol = "p ajustada" if ajuste != "ninguno" else "p"
    sigs = t_pares[t_pares[pcol] < alfa].copy()
    sigs["_a"] = sigs[simb].abs()
    sigs = sigs.sort_values("_a", ascending=False)
    nombre = "r de Pearson" if metodo == "pearson" else "rho (ρ) de Spearman"
    parrafo = (f"Se calculó la matriz de correlaciones con el coeficiente {nombre} entre {k} variables "
               f"({'; '.join(vs)}). ")
    if len(sigs):
        lst = "; ".join(f"{r_['Par']}: {'*r*' if metodo == 'pearson' else '*ρ*'} = {fnum(r_[simb], 2, True)}, {P(r_[pcol])}"
                        for _, r_ in sigs.head(10).iterrows())
        uno = len(sigs) == 1
        parrafo += (f"{'Se halló 1 correlación estadísticamente significativa' if uno else f'Se hallaron {len(sigs)} correlaciones estadísticamente significativas'} "
                    f"de un total de {len(t_pares)}"
                    f"{'' if ajuste == 'ninguno' else ' (valores *p* ajustados con ' + ajuste.capitalize() + ')'}. "
                    f"{'La de mayor magnitud fue' if uno else 'Las de mayor magnitud fueron'}: {lst}.")
    else:
        parrafo += "No se hallaron correlaciones estadísticamente significativas."
    nom_n = next((r["prueba"] for r in norm.values() if r["prueba"]), "normalidad")
    metodo_txt = (f"Se evaluó la normalidad de cada variable con la prueba de {nom_n}. "
                  f"{'Todas las variables fueron normales, por lo que' if metodo == 'pearson' else 'Dado que al menos una variable no fue normal u ordinal,'} "
                  f"se utilizó el coeficiente {nombre} para toda la matriz"
                  f"{'' if ajuste == 'ninguno' else ', con ajuste de ' + ajuste.capitalize() + ' por comparaciones múltiples'}. "
                  f"Nivel de significancia α = {fnum(alfa, 2, True)}.")
    # heatmap divergente azul ↔ gris ↔ rojo
    from matplotlib.colors import LinearSegmentedColormap
    estilo_graficos()
    cmap = LinearSegmentedColormap.from_list("div", ["#e34948", NEUTRO, "#2a78d6"])
    fig, ax = plt.subplots(figsize=(1.05 * (k - 1) + 2.6, 0.95 * (k - 1) + 1.7))
    Rm = R[1:, :-1].copy()                                  # triángulo inferior sin la diagonal (siempre 1)
    mascara = np.triu(np.ones((k - 1, k - 1), bool), 1)
    Rm[mascara] = np.nan
    ax.imshow(np.ma.masked_invalid(Rm), cmap=cmap, vmin=-1, vmax=1)
    for i in range(1, k):
        for j in range(i):
            if not np.isnan(R[i, j]):
                txt = fnum(R[i, j], 2, True) + _estrellas(padj[i, j])
                col = "white" if abs(R[i, j]) > 0.6 else TINTA
                ax.text(j, i - 1, txt, ha="center", va="center", fontsize=9, color=col)
    ax.set_xticks(range(k - 1))
    ax.set_yticks(range(k - 1))
    ax.set_xticklabels(vs[:-1], rotation=40, ha="right")
    ax.set_yticklabels(vs[1:])
    ax.set_xticks(np.arange(-.5, k - 1, 1), minor=True)
    ax.set_yticks(np.arange(-.5, k - 1, 1), minor=True)
    ax.grid(which="minor", color="white", linewidth=2)
    ax.grid(which="major", visible=False)
    ax.tick_params(which="minor", length=0)
    for s in ax.spines.values():
        s.set_visible(False)
    figura = guardar_fig(fig, salida, "matriz_correlaciones")
    res = Resultado(id="matriz_correlaciones", titulo="Matriz de correlaciones",
                    prueba=f"Correlación {nombre} (matriz de {k} variables)",
                    tablas={f"Matriz de correlaciones ({nombre})": t_apa, "Detalle por par de variables": t_pares},
                    notas_tabla={f"Matriz de correlaciones ({nombre})": "Nota. *p < .05. **p < .01. ***p < .001"
                                 + ("" if ajuste == "ninguno" else f" (ajustado con {ajuste.capitalize()})") + "."},
                    figuras=[figura], pies_figura=["Mapa de calor de las correlaciones (azul = positiva, rojo = negativa)"],
                    parrafo=parrafo, metodo=metodo_txt, avisos=avisos,
                    supuestos=[f"Normalidad de {v} ({r['prueba']}): {p_norm_txt(r)}"
                               + (" → normal" if r["normal"] else " → no normal") for v, r in norm.items()])
    res.datos = dict(R=R, P=Pm, padj=padj, N=N, metodo=metodo, variables=vs)
    return res


# ============================================================================
# CHI CUADRADO / FISHER
# ============================================================================


def _or_ic(tab):
    a, b, c, d = (float(v) for v in np.asarray(tab).ravel())
    if min(a, b, c, d) == 0:
        a, b, c, d = a + .5, b + .5, c + .5, d + .5
    orr = (a * d) / (b * c)
    se = math.sqrt(1 / a + 1 / b + 1 / c + 1 / d)
    return orr, math.exp(math.log(orr) - 1.96 * se), math.exp(math.log(orr) + 1.96 * se)


def chi_cuadrado(df, x, y, h0=None, h1=None, salida=None, alfa: float = ALFA) -> Resultado:
    """Asociación entre dos variables categóricas: χ² de Pearson (o Fisher si 2×2 con frecuencias bajas) + V de Cramér."""
    x, y = _col(df, x), _col(df, y)
    d = pd.DataFrame({x: df[x].map(_etq), y: df[y].map(_etq)}).dropna()
    nx_, ny_ = _niveles(df.loc[d.index, x]), _niveles(df.loc[d.index, y])
    obs = pd.crosstab(d[x], d[y]).reindex(index=nx_, columns=ny_, fill_value=0)
    obs = obs.loc[obs.sum(axis=1) > 0, obs.sum(axis=0) > 0]
    r_, c_ = obs.shape
    if r_ < 2 or c_ < 2:
        raise ValueError("Cada variable necesita al menos 2 categorías con datos.")
    n = int(obs.values.sum())
    chi2, p_chi, gl, esp = stats.chi2_contingency(obs.values, correction=False)
    min_esp = float(esp.min())
    pct_bajos = 100 * float((esp < 5).mean())
    avisos = []
    supuestos = [f"Frecuencias esperadas: mínima = {fnum(min_esp)}; {fnum(pct_bajos, 1)}% de las casillas con "
                 f"frecuencia esperada < 5 " + ("→ se cumple el supuesto" if pct_bajos <= 20 and min_esp >= 1 else
                                              "→ NO se cumple el supuesto del χ²")]
    dosxdos = (r_ == 2 and c_ == 2)
    usa_fisher = dosxdos and (min_esp < 5)
    v = math.sqrt(chi2 / (n * min(r_ - 1, c_ - 1)))
    dfmin = min(r_ - 1, c_ - 1)
    efecto_nombre = "φ" if dosxdos else "V de Cramér"
    if usa_fisher:
        orr, p = stats.fisher_exact(obs.values)
        orr, lo, hi = _or_ic(obs.values)
        prueba = "Prueba exacta de Fisher"
        tabla_p = pd.DataFrame([{"Prueba": prueba, "p": float(stats.fisher_exact(obs.values)[1]), "OR": orr,
                                 "IC 95% inf.": lo, "IC 95% sup.": hi, "φ": v, "n": n}])
        p = float(stats.fisher_exact(obs.values)[1])
        estad = f"prueba exacta de Fisher, {P(p)}, OR = {fnum(orr)}, IC 95% [{fnum(lo)}, {fnum(hi)}], *φ* = {fnum(v, 2, True)}"
        razon = "al menos una frecuencia esperada fue menor que 5 en una tabla de 2 × 2"
    else:
        p = float(p_chi)
        prueba = "Chi cuadrado de independencia de Pearson"
        fila = {"Prueba": prueba, "χ²": chi2, "gl": gl, "p": p, efecto_nombre: v, "n": n}
        if dosxdos:
            orr, lo, hi = _or_ic(obs.values)
            fila.update({"OR": orr, "IC 95% inf.": lo, "IC 95% sup.": hi})
        tabla_p = pd.DataFrame([fila])
        estad = f"*χ*²({gl}, *N* = {n}) = {fnum(chi2)}, {P(p)}, *{'φ' if dosxdos else 'V'}* = {fnum(v, 2, True)}"
        razon = "todas las frecuencias esperadas fueron adecuadas (≥ 5)" if pct_bajos == 0 else \
            "no más del 20% de las frecuencias esperadas fue menor que 5"
        if pct_bajos > 20 or min_esp < 1:
            avisos.append("Más del 20% de las casillas tiene frecuencia esperada < 5 (o alguna < 1): el χ² puede ser "
                          "poco fiable. Agrupa categorías con sentido teórico o usa una prueba exacta (Fisher-Freeman-"
                          "Halton en R o SPSS Exact).")
    sig = p < alfa
    mag = mag_v(v, dfmin)
    # tabla de contingencia con n (% por fila)
    filas = []
    for cat in obs.index:
        tot = int(obs.loc[cat].sum())
        f = {x: cat}
        for col in obs.columns:
            f[f"{y}: {col}"] = f"{int(obs.loc[cat, col])} ({fnum(100 * obs.loc[cat, col] / tot, 1)}%)"
        f["Total"] = f"{tot} (100%)"
        filas.append(f)
    tot_col = obs.sum(axis=0)
    filas.append({x: "Total", **{f"{y}: {col}": f"{int(tot_col[col])} ({fnum(100 * tot_col[col] / n, 1)}%)" for col in obs.columns},
                  "Total": f"{n} (100%)"})
    t_cont = pd.DataFrame(filas)
    h0 = h0 or f"{x} y {y} son independientes (no existe asociación)."
    h1 = h1 or f"{x} y {y} no son independientes (existe asociación)."
    decision = decision_txt(p, alfa)
    nombre_prueba = ("prueba exacta de Fisher" if usa_fisher else "prueba chi cuadrado de independencia de Pearson")
    parrafo = (f"Se aplicó la {nombre_prueba} para analizar la asociación entre {x} y {y} "
               f"(*N* = {n}). Los resultados {'evidencian' if sig else 'no evidencian'} una asociación estadísticamente "
               f"significativa, {estad}")
    if sig:
        parrafo += f", con un tamaño del efecto {mag}. Por tanto, se rechaza la hipótesis nula de independencia."
    else:
        parrafo += ". Por tanto, no se rechaza la hipótesis nula: no hay evidencia suficiente de asociación entre las variables."
    res_adj = None
    if (not dosxdos) and sig:
        filas_ = obs.sum(axis=1).values[:, None] / n
        cols_ = obs.sum(axis=0).values[None, :] / n
        adj = (obs.values - esp) / np.sqrt(esp * (1 - filas_) * (1 - cols_))
        res_adj = pd.DataFrame(adj, index=obs.index, columns=[f"{y}: {c}" for c in obs.columns]).reset_index()
        res_adj = res_adj.rename(columns={res_adj.columns[0]: x})
        grandes = [(obs.index[i], obs.columns[j], adj[i, j]) for i in range(r_) for j in range(c_)
                   if abs(adj[i, j]) > 1.96]
        if grandes:
            parrafo += (" Los residuos tipificados corregidos (|z| > 1.96) señalan las casillas que más contribuyen a la "
                        "asociación: " + "; ".join(f"{a_} × {b_} ({'más' if z > 0 else 'menos'} casos de los esperados)"
                                                   for a_, b_, z in grandes[:6]) + ".")
    metodo = (f"Para analizar la asociación entre las variables categóricas {x} y {y} se utilizó "
              f"{'la prueba exacta de Fisher' if usa_fisher else 'la prueba chi cuadrado de independencia de Pearson'}, "
              f"dado que {razon}. Como medida del tamaño del efecto se empleó "
              f"{'phi (φ)' if dosxdos else 'la V de Cramér'}"
              f"{', interpretada con los criterios de Cohen (1988) ajustados por los grados de libertad' if not dosxdos else ' (.10 pequeño, .30 mediano, .50 grande)'}. "
              f"Nivel de significancia α = {fnum(alfa, 2, True)}.")
    # figura: barras 100% apiladas por categoría de x
    estilo_graficos()
    cats_y = list(obs.columns)
    if len(cats_y) > 8:
        avisos.append("Más de 8 categorías en la variable de columnas: el gráfico no distingue tantos colores; revisa la tabla.")
    fig, ax = plt.subplots(figsize=(6.4, max(2.4, 0.8 * r_ + 1.4)))
    pct = 100 * obs.values / obs.values.sum(axis=1, keepdims=True)
    izq = np.zeros(r_)
    for j, cy in enumerate(cats_y):
        col = CAT[j % len(CAT)]
        ax.barh(range(r_), pct[:, j], left=izq, color=col, edgecolor="white", linewidth=1.5, height=0.62,
                label=f"{cy}")
        for i in range(r_):
            if pct[i, j] >= 8:
                ax.text(izq[i] + pct[i, j] / 2, i, f"{pct[i, j]:.0f}%", ha="center", va="center", fontsize=8.5,
                        color="white")
        izq += pct[:, j]
    ax.set_yticks(range(r_))
    ax.set_yticklabels(list(obs.index))
    ax.invert_yaxis()
    ax.set_xlim(0, 100)
    ax.set_xlabel("Porcentaje dentro de cada categoría de " + x)
    ax.grid(axis="y", visible=False)
    ax.grid(axis="x", visible=True)
    ax.legend(title=y, loc="upper center", bbox_to_anchor=(0.5, -0.2), ncol=min(len(cats_y), 4), fontsize=8.5,
              title_fontsize=9)
    figura = guardar_fig(fig, salida, f"chi2_{_slug(x)}_{_slug(y)}")
    tablas = {"Tabla de contingencia, n (% por fila)": t_cont, "Contraste de asociación": tabla_p}
    if res_adj is not None:
        tablas["Residuos tipificados corregidos"] = res_adj
    res = Resultado(id=f"chi2_{_slug(x)}_{_slug(y)}", titulo=f"Asociación entre {x} y {y}", prueba=prueba,
                    h0=h0, h1=h1, decision=decision, tablas=tablas,
                    notas_tabla={"Contraste de asociación": "Nota. φ = coeficiente phi (tablas 2 × 2); V = V de Cramér; "
                                                            "OR = razón de momios (odds ratio) con IC 95%."
                                 if dosxdos else "Nota. V = V de Cramér."},
                    figuras=[figura], pies_figura=[f"Distribución porcentual de {y} según {x}"],
                    parrafo=parrafo, metodo=metodo, supuestos=supuestos, avisos=avisos)
    res.datos = dict(chi2=chi2, gl=gl, p=p, V=v, esperadas_min=min_esp, fisher=usa_fisher, n=n)
    return res
