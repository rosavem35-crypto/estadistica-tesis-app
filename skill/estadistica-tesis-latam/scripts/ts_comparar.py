# -*- coding: utf-8 -*-
"""
ts_comparar.py — Perfil de datos, descriptivos y comparación de grupos.

Funciones públicas:
  perfil_datos, descriptivos, frecuencias, comparar_grupos, comparar_pareadas
El método se elige SOLO tras diagnosticar supuestos (normalidad, homogeneidad de varianzas).
"""
from __future__ import annotations

import math
import warnings

import numpy as np
import pandas as pd
from scipy import stats

from ts_base import (ALFA, CAT, EJE, MUDO, TINTA, TINTA2, Resultado, _col, _etq, _niveles, _numerica,
                     _slug, _dec, atipicos_iqr, decision_txt, desc_serie, estilo_graficos, fig_cajas, fnum,
                     guardar_fig, mag_d, mag_eta, mag_r, p_norm_txt, test_normalidad, P, plt, fp_valor)

# ============================================================================
# PERFIL DE DATOS
# ============================================================================


def _tipo_variable(s: pd.Series) -> str:
    nn = s.dropna()
    nu = nn.nunique()
    if len(nn) == 0:
        return "vacía"
    if pd.api.types.is_bool_dtype(s):
        return "binaria"
    if pd.api.types.is_numeric_dtype(s):
        if nu <= 2:
            return "binaria"
        entero = bool(np.all(np.mod(nn.astype(float), 1) == 0))
        if entero and len(nn) > 20 and nu == len(nn) and nn.is_monotonic_increasing:
            return "identificador (se ignora)"
        if nu <= 7 and entero:
            return "ordinal / Likert (posible)"
        return "numérica continua"
    if nu <= 2:
        return "binaria"
    if len(nn) > 20 and nu > 0.5 * len(nn):
        return "texto / identificador"
    return f"categórica ({nu} niveles)"


def perfil_datos(df: pd.DataFrame, variables=None, normalidad: str = "auto", salida=None) -> Resultado:
    """Radiografía de la base de datos antes de analizar (paso 0 obligatorio)."""
    cols = [_col(df, v) for v in variables] if variables else list(df.columns)
    filas, alertas = [], []
    num_cols = []
    for c in cols:
        s = df[c]
        tipo = _tipo_variable(s)
        n_val = int(s.notna().sum())
        falt = 100 * (1 - n_val / len(df)) if len(df) else 0.0
        fila = {"Variable": c, "Tipo detectado": tipo, "n válido": n_val, "% faltante": falt,
                "M": np.nan, "DE": np.nan, "Asimetría": np.nan, "Curtosis": np.nan,
                "Normalidad": "", "Atípicos (IQR)": ""}
        if (pd.api.types.is_numeric_dtype(s) and not pd.api.types.is_bool_dtype(s) and n_val > 0
                and not tipo.startswith("identificador")):
            d = desc_serie(s)
            nr = test_normalidad(s, normalidad)
            fila.update({"M": d["M"], "DE": d["DE"], "Asimetría": d["asim"], "Curtosis": d["curt"]})
            if nr["prueba"] and not np.isnan(nr["p"]):
                vp = fp_valor(nr["p"])
                nombre_t = "Shapiro-Wilk" if nr["prueba"].startswith("Shapiro") else "K-S (Lilliefors)"
                fila["Normalidad"] = (f"{nombre_t}: p {vp}" if vp.startswith("<") else f"{nombre_t}: p = {vp}") \
                    + (" (normal)" if nr["normal"] else " (no normal)")
            if tipo.startswith("numérica"):
                fila["Atípicos (IQR)"] = atipicos_iqr(s)
                num_cols.append(c)
                if atipicos_iqr(s) > 0:
                    alertas.append(f"'{c}' tiene {atipicos_iqr(s)} valor(es) atípico(s) (regla 1.5×IQR). "
                                   "Verifica si son errores de digitación antes de excluirlos.")
            if tipo.startswith("ordinal"):
                alertas.append(f"'{c}' parece una escala ordinal (pocos valores enteros). Para comparar "
                               "grupos o correlacionar considera pruebas no paramétricas (ordinal=True).")
        if falt > 5:
            alertas.append(f"'{c}' tiene {falt:.1f}% de datos faltantes (> 5%). Reporta cómo los tratas.")
        filas.append(fila)
    tabla = pd.DataFrame(filas)
    n = len(df)
    if n < 30:
        alertas.append(f"La base tiene solo {n} filas: los supuestos y la potencia serán limitados.")
    figs, pies = [], []
    if num_cols:
        usar = num_cols[:6]
        estilo_graficos()
        nc = min(3, len(usar))
        nr_ = math.ceil(len(usar) / nc)
        fig, axes = plt.subplots(nr_, nc, figsize=(3.6 * nc, 2.8 * nr_), squeeze=False)
        for ax, c in zip(axes.ravel(), usar):
            ax.hist(df[c].dropna(), bins="auto", color=CAT[0], alpha=0.75, edgecolor="white", linewidth=0.8)
            ax.set_title(c, fontsize=9, loc="left", color=TINTA2)
            ax.grid(axis="x", visible=False)
        for ax in axes.ravel()[len(usar):]:
            ax.axis("off")
        fig.supylabel("Frecuencia", fontsize=9, color=TINTA2)
        fig.tight_layout()
        figs.append(guardar_fig(fig, salida, "perfil_distribuciones"))
        pies.append("Distribución de las variables numéricas principales")
    res = Resultado(id="perfil", titulo="Perfil de la base de datos",
                    prueba="Diagnóstico previo: tipos de variable, datos faltantes, distribución y atípicos",
                    tablas={"Perfil de las variables": tabla}, figuras=figs, pies_figura=pies,
                    avisos=sorted(set(alertas)))
    res.parrafo = (f"La base de datos analizada estuvo conformada por {n} registros y {len(df.columns)} variables. "
                   "Antes de los análisis inferenciales se revisaron los tipos de variable, los datos faltantes, "
                   "los valores atípicos y el supuesto de normalidad de las variables numéricas.")
    res.datos = {"n": n, "k": len(df.columns)}
    return res


# ============================================================================
# DESCRIPTIVOS
# ============================================================================


def descriptivos(df, variables, por=None, salida=None) -> Resultado:
    vs = [_col(df, v) for v in variables]
    filas = []
    if por:
        g = _col(df, por)
        niv = _niveles(df[g])
        gs = df[g].map(_etq)
    for v in vs:
        x = pd.to_numeric(df[v], errors="coerce")
        bloques = [("", x)] if not por else [(n, x[gs == n]) for n in niv]
        for nom, serie in bloques:
            d = desc_serie(serie)
            f = {"Variable": v}
            if por:
                f[por] = nom
            f.update({"n": d["n"], "M": d["M"], "DE": d["DE"], "Mdn": d["Mdn"], "RIC": d["RIC"],
                      "Mín": d["Min"], "Máx": d["Max"], "Asimetría": d["asim"], "Curtosis": d["curt"]})
            filas.append(f)
    tabla = pd.DataFrame(filas)
    res = Resultado(id="descriptivos_" + _slug("_".join(vs))[:30],
                    titulo="Estadísticos descriptivos", prueba="Medidas de tendencia central y dispersión",
                    tablas={"Estadísticos descriptivos": tabla})
    frases = []
    for _, f in tabla.iterrows():
        etiqueta = f["Variable"] + (f" ({f[por]})" if por else "")
        frases.append(f"{etiqueta}: *M* = {fnum(f['M'])}, *DE* = {fnum(f['DE'])} (*n* = {int(f['n'])})")
    res.parrafo = "Los estadísticos descriptivos fueron los siguientes: " + "; ".join(frases) + "."
    res.notas_tabla["Estadísticos descriptivos"] = ("Nota. M = media; DE = desviación estándar; Mdn = mediana; "
                                                    "RIC = rango intercuartílico (Q3 − Q1).")
    return res


def frecuencias(df, variable, orden=None, salida=None) -> Resultado:
    v = _col(df, variable)
    s = df[v].dropna().map(_etq)
    cuentas = s.value_counts()
    niv = orden or (_niveles(df[v].dropna()) if df[v].nunique() < 30 else list(cuentas.index))
    cuentas = cuentas.reindex([n for n in niv if n in cuentas.index])
    tot = int(cuentas.sum())
    tabla = pd.DataFrame({v: cuentas.index, "f": cuentas.values.astype(int),
                          "%": 100 * cuentas.values / tot})
    tabla.loc[len(tabla)] = ["Total", tot, 100.0]
    estilo_graficos()
    fig, ax = plt.subplots(figsize=(max(3.6, 0.9 * len(cuentas) + 1.5), 3.8))
    barras = ax.bar(range(len(cuentas)), 100 * cuentas.values / tot, color=CAT[0], width=0.6)
    for b, c in zip(barras, cuentas.values):
        ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 0.8, f"{100 * c / tot:.1f}%",
                ha="center", va="bottom", fontsize=8.5, color=TINTA2)
    ax.set_xticks(range(len(cuentas)))
    ax.set_xticklabels(cuentas.index, rotation=0 if len(cuentas) < 6 else 30,
                       ha="center" if len(cuentas) < 6 else "right")
    ax.set_ylabel("Porcentaje")
    ax.set_ylim(0, max(100 * cuentas.max() / tot * 1.18, 10))
    ax.grid(axis="x", visible=False)
    ruta = guardar_fig(fig, salida, "frec_" + _slug(v))
    top = cuentas.idxmax()
    res = Resultado(id="frecuencias_" + _slug(v), titulo=f"Distribución de frecuencias de {v}",
                    prueba="Frecuencias y porcentajes", tablas={f"Distribución de {v}": tabla},
                    figuras=[ruta], pies_figura=[f"Distribución porcentual de {v}"])
    res.parrafo = (f"Respecto a {v}, de los {tot} casos válidos, la categoría más frecuente fue «{top}» "
                   f"(*f* = {int(cuentas[top])}; {fnum(100 * cuentas[top] / tot, 1)}%).")
    return res


# ============================================================================
# FUNCIONES ESTADÍSTICAS DE BAJO NIVEL (probadas contra scipy / pingouin / scikit-posthocs)
# ============================================================================


def t_independiente(a, b, igual_var: bool) -> dict:
    a, b = np.asarray(a, float), np.asarray(b, float)
    n1, n2 = len(a), len(b)
    m1, m2, v1, v2 = a.mean(), b.mean(), a.var(ddof=1), b.var(ddof=1)
    sp = math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2))
    if igual_var:
        gl = n1 + n2 - 2
        se = sp * math.sqrt(1 / n1 + 1 / n2)
    else:
        se = math.sqrt(v1 / n1 + v2 / n2)
        gl = se ** 4 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1))
    dif = m1 - m2
    t = dif / se if se > 0 else np.nan
    p = 2 * stats.t.sf(abs(t), gl)
    tc = stats.t.ppf(0.975, gl)
    return dict(t=t, gl=gl, p=p, dif=dif, ic=(dif - tc * se, dif + tc * se), d=dif / sp if sp > 0 else np.nan)


def mann_whitney(a, b) -> dict:
    a, b = np.asarray(a, float), np.asarray(b, float)
    n1, n2 = len(a), len(b)
    r = stats.mannwhitneyu(a, b, alternative="two-sided", use_continuity=False, method="auto")
    u1 = float(r.statistic)
    u = min(u1, n1 * n2 - u1)
    N = n1 + n2
    _, cnt = np.unique(np.concatenate([a, b]), return_counts=True)
    tie = float((cnt ** 3 - cnt).sum())
    sigma = math.sqrt(n1 * n2 / 12 * ((N + 1) - tie / (N * (N - 1))))
    z = (u - n1 * n2 / 2) / sigma if sigma > 0 else np.nan
    return dict(U=u, U1=u1, z=z, p=float(r.pvalue), rbc=2 * u1 / (n1 * n2) - 1)


def anova_clasica(arrs) -> dict:
    arrs = [np.asarray(a, float) for a in arrs]
    k, n = len(arrs), sum(len(a) for a in arrs)
    gm = np.concatenate(arrs).mean()
    ssb = sum(len(a) * (a.mean() - gm) ** 2 for a in arrs)
    ssw = sum(((a - a.mean()) ** 2).sum() for a in arrs)
    gl1, gl2 = k - 1, n - k
    msb, msw = ssb / gl1, ssw / gl2
    F = msb / msw if msw > 0 else np.nan
    return dict(ssb=ssb, ssw=ssw, gl1=gl1, gl2=gl2, msb=msb, msw=msw, F=F,
                p=float(stats.f.sf(F, gl1, gl2)), eta2=ssb / (ssb + ssw))


def anova_welch(arrs) -> dict:
    arrs = [np.asarray(a, float) for a in arrs]
    k = len(arrs)
    n = np.array([len(a) for a in arrs], float)
    m = np.array([a.mean() for a in arrs])
    v = np.array([a.var(ddof=1) for a in arrs])
    w = n / v
    sw = w.sum()
    mw = (w * m).sum() / sw
    num = (w * (m - mw) ** 2).sum() / (k - 1)
    lam = ((1 - w / sw) ** 2 / (n - 1)).sum()
    den = 1 + 2 * (k - 2) / (k ** 2 - 1) * lam
    F = num / den
    gl2 = (k ** 2 - 1) / (3 * lam)
    return dict(F=F, gl1=k - 1, gl2=gl2, p=float(stats.f.sf(F, k - 1, gl2)))


def kruskal(arrs) -> dict:
    arrs = [np.asarray(a, float) for a in arrs]
    r = stats.kruskal(*arrs)
    n = sum(len(a) for a in arrs)
    H = float(r.statistic)
    return dict(H=H, gl=len(arrs) - 1, p=float(r.pvalue), eps2=H * (n + 1) / (n ** 2 - 1))


def tukey_hsd(arrs, nombres) -> pd.DataFrame:
    arrs = [np.asarray(a, float) for a in arrs]
    r = stats.tukey_hsd(*arrs)
    ci = r.confidence_interval(0.95)
    filas = []
    for i in range(len(arrs)):
        for j in range(i + 1, len(arrs)):
            filas.append({"Comparación": f"{nombres[i]} − {nombres[j]}", "Dif. de medias": float(r.statistic[i, j]),
                          "IC 95% inf.": float(ci.low[i, j]), "IC 95% sup.": float(ci.high[i, j]),
                          "p (Tukey)": float(r.pvalue[i, j])})
    return pd.DataFrame(filas)


def games_howell(arrs, nombres) -> pd.DataFrame:
    arrs = [np.asarray(a, float) for a in arrs]
    k = len(arrs)
    filas = []
    for i in range(k):
        for j in range(i + 1, k):
            a, b = arrs[i], arrs[j]
            va, vb = a.var(ddof=1) / len(a), b.var(ddof=1) / len(b)
            se = math.sqrt(va + vb)
            dif = a.mean() - b.mean()
            gl = (va + vb) ** 2 / (va ** 2 / (len(a) - 1) + vb ** 2 / (len(b) - 1))
            q = abs(dif) / se * math.sqrt(2)
            p = float(stats.studentized_range.sf(q, k, gl))
            qc = float(stats.studentized_range.ppf(0.95, k, gl))
            h = qc / math.sqrt(2) * se
            filas.append({"Comparación": f"{nombres[i]} − {nombres[j]}", "Dif. de medias": dif,
                          "IC 95% inf.": dif - h, "IC 95% sup.": dif + h, "p (Games-Howell)": p})
    return pd.DataFrame(filas)


def dunn(arrs, nombres) -> pd.DataFrame:
    arrs = [np.asarray(a, float) for a in arrs]
    todo = np.concatenate(arrs)
    N = len(todo)
    rangos = stats.rankdata(todo)
    cortes = np.cumsum([0] + [len(a) for a in arrs])
    R = [rangos[cortes[i]:cortes[i + 1]].mean() for i in range(len(arrs))]
    _, cnt = np.unique(todo, return_counts=True)
    sig2 = N * (N + 1) / 12 - float((cnt ** 3 - cnt).sum()) / (12 * (N - 1))
    filas = []
    for i in range(len(arrs)):
        for j in range(i + 1, len(arrs)):
            se = math.sqrt(sig2 * (1 / len(arrs[i]) + 1 / len(arrs[j])))
            z = (R[i] - R[j]) / se
            filas.append({"Comparación": f"{nombres[i]} − {nombres[j]}", "Dif. de rangos medios": R[i] - R[j],
                          "Z": z, "p": 2 * stats.norm.sf(abs(z))})
    t = pd.DataFrame(filas)
    t["p ajustada (Bonferroni)"] = np.minimum(1.0, t["p"] * len(t))
    return t


def wilcoxon_pareado(dif) -> dict:
    dif = np.asarray(dif, float)
    dif = dif[dif != 0]
    n = len(dif)
    if n < 1:
        raise ValueError("Todas las diferencias son 0: no hay nada que contrastar.")
    abs_d = np.abs(dif)
    rangos = stats.rankdata(abs_d)
    wp, wm = rangos[dif > 0].sum(), rangos[dif < 0].sum()
    T = min(wp, wm)
    _, cnt = np.unique(abs_d, return_counts=True)
    tie = float((cnt ** 3 - cnt).sum())
    sigma = math.sqrt(n * (n + 1) * (2 * n + 1) / 24 - tie / 48)
    z = (T - n * (n + 1) / 4) / sigma if sigma > 0 else np.nan
    p = float(stats.wilcoxon(dif, zero_method="wilcox", correction=False, method="auto").pvalue)
    return dict(Wp=float(wp), Wm=float(wm), z=z, p=p, rbc=(wp - wm) / (wp + wm), n=n)


# ============================================================================
# COMPARACIÓN DE GRUPOS INDEPENDIENTES (2 o más)
# ============================================================================


def _resumen_grupos(nombres, arrs, y) -> pd.DataFrame:
    filas = []
    for nom, a in zip(nombres, arrs):
        d = desc_serie(a)
        filas.append({"Grupo": nom, "n": d["n"], "M": d["M"], "DE": d["DE"], "Mdn": d["Mdn"], "RIC": d["RIC"],
                      "Mín": d["Min"], "Máx": d["Max"]})
    return pd.DataFrame(filas)


def _txt_grupo(nom, d, param: bool) -> str:
    if param:
        return f"{nom} (*M* = {fnum(d['M'])}, *DE* = {fnum(d['DE'])}, *n* = {d['n']})"
    return f"{nom} (*Mdn* = {fnum(d['Mdn'])}, *RIC* = {fnum(d['RIC'])}, *n* = {d['n']})"


def comparar_grupos(df, y, grupo, ordinal: bool = False, normalidad: str = "auto", h0=None, h1=None,
                    orden=None, salida=None, alfa: float = ALFA) -> Resultado:
    """
    Compara la variable numérica `y` entre los niveles de `grupo` (muestras independientes).
    Diagnostica normalidad y homogeneidad de varianzas y elige:
      2 grupos : t de Student | t de Welch | U de Mann-Whitney
      3+ grupos: ANOVA + Tukey | ANOVA de Welch + Games-Howell | Kruskal-Wallis + Dunn (Bonferroni)
    """
    y, g = _col(df, y), _col(df, grupo)
    d = pd.DataFrame({y: _numerica(df, y), "_g": df[g].map(_etq)})
    excl = int(d[y].isna().sum() + df[g].isna().sum())
    d = d.dropna()
    niv = [_etq(o) for o in orden] if orden else _niveles(df.loc[d.index, g])
    niv = [n for n in niv if n in set(d["_g"])]
    k = len(niv)
    if k < 2:
        raise ValueError(f"'{g}' tiene {k} nivel(es) con datos; se necesitan al menos 2 grupos.")
    arrs = [d.loc[d["_g"] == n, y].to_numpy(float) for n in niv]
    for n, a in zip(niv, arrs):
        if len(a) < 2:
            raise ValueError(f"El grupo '{n}' tiene solo {len(a)} observación(es); se necesitan al menos 2 "
                             "(idealmente 10 o más) para comparar.")
    avisos = []
    if excl:
        avisos.append(f"Se excluyeron {excl} registro(s) con datos faltantes en {y} o {g}.")
    if k > 8:
        avisos.append(f"'{g}' tiene {k} niveles: verifica que sea realmente una variable de agrupación.")
    for n, a in zip(niv, arrs):
        if len(a) < 10:
            avisos.append(f"El grupo '{n}' tiene n = {len(a)} (< 10): los resultados son frágiles; "
                          "interprétalos con cautela y prefiere pruebas no paramétricas.")

    # ---- Diagnóstico de supuestos
    norm = {n: test_normalidad(a, normalidad) for n, a in zip(niv, arrs)}
    todos_normales = (not ordinal) and all(r["normal"] is True for r in norm.values())
    lev_p = np.nan
    homog = False
    if all(np.ptp(a) > 0 for a in arrs):
        lev_p = float(stats.levene(*arrs, center="mean").pvalue)
        homog = lev_p > alfa
    supuestos = []
    nombre_norm = next((r["prueba"] for r in norm.values() if r["prueba"]), "normalidad")
    supuestos.append("Normalidad por grupo (" + nombre_norm + "): "
                     + "; ".join(f"{n}: {p_norm_txt(r)}" + (" → normal" if r["normal"] else " → no normal")
                                 for n, r in norm.items()))
    if ordinal:
        supuestos.append("Variable declarada ordinal: se usan pruebas no paramétricas por definición.")
    supuestos.append(f"Homogeneidad de varianzas (Levene): {P(lev_p)}" +
                     (" → varianzas homogéneas" if homog else " → varianzas diferentes")
                     if not np.isnan(lev_p) else "Homogeneidad de varianzas: no evaluable (grupo sin variabilidad).")
    # ---- Selección del método
    stats_g = [desc_serie(a) for a in arrs]
    dfres = {}
    tablas, notas = {}, {}
    if k == 2:
        a, b = arrs
        if todos_normales:
            igual = homog
            r = t_independiente(a, b, igual)
            prueba = "t de Student para muestras independientes" if igual else "t de Welch para muestras independientes"
            tabla = pd.DataFrame([{"Prueba": prueba, "t": r["t"], "gl": r["gl"], "p": r["p"],
                                   "Dif. de medias": r["dif"], "IC 95% inf.": r["ic"][0],
                                   "IC 95% sup.": r["ic"][1], "d de Cohen": r["d"]}])
            efecto_txt = f"*d* de Cohen = {fnum(r['d'])}"
            mag = mag_d(r["d"])
            p, dfres = r["p"], r
            param = True
            gl_txt = fnum(r["gl"], 0) if igual else fnum(r["gl"], 2)
            estad = f"*t*({gl_txt}) = {fnum(r['t'])}"
            ic_txt = f", IC 95% de la diferencia de medias [{fnum(r['ic'][0])}, {fnum(r['ic'][1])}]"
            razon = ("ambos grupos cumplieron el supuesto de normalidad y las varianzas fueron homogéneas"
                     if igual else "ambos grupos cumplieron el supuesto de normalidad, pero las varianzas no fueron "
                                   "homogéneas (se aplicó la corrección de Welch)")
            notas["Comparación"] = ("Nota. d de Cohen calculada con la desviación estándar agrupada; "
                                    "IC = intervalo de confianza de la diferencia de medias (grupo 1 − grupo 2).")
        else:
            r = mann_whitney(a, b)
            prueba = "U de Mann-Whitney"
            tabla = pd.DataFrame([{"Prueba": prueba, "U": r["U"], "Z": r["z"], "p": r["p"],
                                   "r biserial": r["rbc"]}])
            efecto_txt = f"*r* biserial de rangos = {fnum(r['rbc'], 2, True)}"
            mag = mag_r(r["rbc"])
            p, dfres = r["p"], r
            param = False
            estad = f"*U* = {fnum(r['U'], 1)}, *Z* = {fnum(r['z'])}"
            ic_txt = ""
            if ordinal:
                razon = "la variable es de naturaleza ordinal"
            else:
                malos = [n for n, rr in norm.items() if rr["normal"] is not True]
                razon = ("no se cumplió el supuesto de normalidad en " +
                         ("el grupo " if len(malos) == 1 else "los grupos ") + ", ".join(malos))
            notas["Comparación"] = ("Nota. U = estadístico U de Mann-Whitney (el menor de los dos); "
                                    "r biserial de rangos = 2U₁/(n₁n₂) − 1 (positivo si el primer grupo tiende a "
                                    "puntuar más alto).")
        tablas["Comparación"] = tabla
        sig = p < alfa
        h0 = h0 or f"No existen diferencias estadísticamente significativas en {y} entre {niv[0]} y {niv[1]}."
        h1 = h1 or f"Existen diferencias estadísticamente significativas en {y} entre {niv[0]} y {niv[1]}."
        decision = decision_txt(p, alfa)
        concl = ("Por tanto, se rechaza la hipótesis nula." if sig else
                 "Por tanto, no se rechaza la hipótesis nula: no se halló evidencia suficiente de diferencias.")
        # sentido de la diferencia (para que el lector no dependa del signo del estadístico)
        medidas = [s_["M"] if param else s_["Mdn"] for s_ in stats_g]
        mayor = niv[int(np.argmax(medidas))]
        sentido = (f" Los valores de {y} fueron más altos en el grupo {mayor} "
                   f"({'media' if param else 'mediana'} = {fnum(max(medidas))}).") if sig else ""
        parrafo = (f"Se aplicó la prueba {prueba} para comparar {y} entre "
                   f"{_txt_grupo(niv[0], stats_g[0], param)} y {_txt_grupo(niv[1], stats_g[1], param)}. "
                   f"Los resultados {'evidencian' if sig else 'no evidencian'} diferencias estadísticamente "
                   f"significativas, {estad}, {P(p)}{ic_txt}, "
                   f"{efecto_txt}, correspondiente a un tamaño del efecto {mag}.{sentido} {concl}")
        metodo = (f"Se evaluó la normalidad de {y} en cada grupo mediante la prueba de {nombre_norm}"
                  + (" y la homogeneidad de varianzas mediante la prueba de Levene" if param else "")
                  + f". Dado que {razon}, se empleó la prueba {prueba}"
                  + (", acompañada del tamaño del efecto d de Cohen" if param else
                     ", acompañada del tamaño del efecto r biserial de rangos")
                  + f". Se adoptó un nivel de significancia de α = {fnum(alfa, 2, True)}.")
        figura = fig_cajas(arrs, niv, y, salida, f"comparar_{_slug(y)}_{_slug(g)}")
    else:
        post = None
        if todos_normales and homog:
            r = anova_clasica(arrs)
            prueba = "ANOVA de un factor"
            tablas["Tabla ANOVA"] = pd.DataFrame([
                {"Fuente": "Entre grupos", "SC": r["ssb"], "gl": r["gl1"], "MC": r["msb"], "F": r["F"], "p": r["p"]},
                {"Fuente": "Dentro de grupos", "SC": r["ssw"], "gl": r["gl2"], "MC": r["msw"], "F": np.nan, "p": np.nan},
                {"Fuente": "Total", "SC": r["ssb"] + r["ssw"], "gl": r["gl1"] + r["gl2"], "MC": np.nan,
                 "F": np.nan, "p": np.nan}])
            p, dfres, eta = r["p"], r, r["eta2"]
            estad = f"*F*({r['gl1']}, {r['gl2']}) = {fnum(r['F'])}"
            efecto_txt, mag = f"*η*² = {fnum(eta, 2, True)}", mag_eta(eta)
            razon = "todos los grupos cumplieron el supuesto de normalidad y las varianzas fueron homogéneas"
            param, ph_nombre = True, "Tukey (HSD)"
        elif todos_normales and not homog:
            r = anova_welch(arrs)
            cl = anova_clasica(arrs)
            prueba = "ANOVA de Welch"
            tablas["Prueba"] = pd.DataFrame([{"Prueba": prueba, "F": r["F"], "gl1": r["gl1"], "gl2": r["gl2"],
                                              "p": r["p"], "η²": cl["eta2"]}])
            p, dfres, eta = r["p"], r, cl["eta2"]
            estad = f"*F*({r['gl1']}, {fnum(r['gl2'])}) = {fnum(r['F'])}"
            efecto_txt, mag = f"*η*² = {fnum(eta, 2, True)}", mag_eta(eta)
            razon = ("los grupos cumplieron la normalidad, pero las varianzas no fueron homogéneas "
                     "(prueba de Levene)")
            param, ph_nombre = True, "Games-Howell"
            notas["Prueba"] = "Nota. η² calculado a partir de las sumas de cuadrados del ANOVA clásico."
        else:
            r = kruskal(arrs)
            prueba = "H de Kruskal-Wallis"
            tablas["Prueba"] = pd.DataFrame([{"Prueba": prueba, "H": r["H"], "gl": r["gl"], "p": r["p"],
                                              "ε²": r["eps2"]}])
            p, dfres, eta = r["p"], r, r["eps2"]
            estad = f"*H*({r['gl']}) = {fnum(r['H'])}"
            efecto_txt, mag = f"*ε*² = {fnum(eta, 2, True)}", mag_eta(eta)
            if ordinal:
                razon = "la variable es de naturaleza ordinal"
            else:
                malos = [n for n, rr in norm.items() if rr["normal"] is not True]
                razon = ("no se cumplió el supuesto de normalidad en " +
                         ("el grupo " if len(malos) == 1 else "los grupos ") + ", ".join(malos))
            param, ph_nombre = False, "Dunn con corrección de Bonferroni"
            notas["Prueba"] = "Nota. ε² = H(n + 1)/(n² − 1), tamaño del efecto para Kruskal-Wallis."
        sig = p < alfa
        h0 = h0 or f"Las medidas de {y} no difieren de manera estadísticamente significativa entre los grupos de {g}."
        h1 = h1 or f"Al menos un grupo de {g} difiere significativamente en {y}."
        decision = decision_txt(p, alfa)
        grupos_txt = "; ".join(_txt_grupo(n, s, param) for n, s in zip(niv, stats_g))
        parrafo = (f"Se aplicó la prueba {prueba} para comparar {y} entre {k} grupos de {g}: {grupos_txt}. "
                   f"Los resultados {'evidencian' if sig else 'no evidencian'} diferencias estadísticamente "
                   f"significativas entre los grupos, {estad}, {P(p)}, {efecto_txt}, que indica un tamaño del "
                   f"efecto {mag}. ")
        if sig:
            if param and prueba == "ANOVA de un factor":
                post = tukey_hsd(arrs, niv)
            elif param:
                post = games_howell(arrs, niv)
            else:
                post = dunn(arrs, niv)
            tablas[f"Comparaciones múltiples (post hoc: {ph_nombre})"] = post
            pcol = [c for c in post.columns if c.startswith("p")][-1]
            sigs = post[post[pcol] < alfa]
            if len(sigs):
                lista = "; ".join(f"{r_['Comparación']} ({P(r_[pcol])})" for _, r_ in sigs.iterrows())
                parrafo += (f"Las comparaciones múltiples con la prueba post hoc de {ph_nombre} mostraron "
                            f"diferencias significativas en: {lista}. ")
            else:
                parrafo += (f"Las comparaciones múltiples (post hoc de {ph_nombre}) no identificaron pares "
                            "con diferencias significativas. ")
            parrafo += "Por tanto, se rechaza la hipótesis nula."
        else:
            parrafo += ("Por tanto, no se rechaza la hipótesis nula: no se halló evidencia suficiente de "
                        "diferencias entre los grupos, y no corresponde realizar comparaciones post hoc.")
        metodo = (f"Se evaluó la normalidad de {y} en cada grupo mediante la prueba de {nombre_norm} y la "
                  f"homogeneidad de varianzas mediante la prueba de Levene. Dado que {razon}, se empleó la "
                  f"prueba {prueba}" + (f", con comparaciones múltiples de {ph_nombre}" if sig else "")
                  + f" y el tamaño del efecto {'η²' if param else 'ε²'}. Se adoptó un nivel de significancia "
                  f"de α = {fnum(alfa, 2, True)}.")
        figura = fig_cajas(arrs, niv, y, salida, f"comparar_{_slug(y)}_{_slug(g)}")
    tablas = {"Estadísticos descriptivos por grupo": _resumen_grupos(niv, arrs, y), **tablas}
    notas["Estadísticos descriptivos por grupo"] = ("Nota. M = media; DE = desviación estándar; Mdn = mediana; "
                                                    "RIC = rango intercuartílico (Q3 − Q1).")
    res = Resultado(id=f"comparar_{_slug(y)}_{_slug(g)}", titulo=f"Comparación de {y} según {g}", prueba=prueba,
                    h0=h0, h1=h1, decision=decision, tablas=tablas, notas_tabla=notas, figuras=[figura],
                    pies_figura=[f"Distribución de {y} según {g}"], parrafo=parrafo, metodo=metodo,
                    supuestos=supuestos, avisos=avisos)
    res.datos = {"p": p, "prueba": prueba, "k": k, "niveles": niv, "normalidad": norm, "levene_p": lev_p,
                 "detalle": dfres}
    return res


# ============================================================================
# MUESTRAS RELACIONADAS (pre-post, dos mediciones del mismo grupo)
# ============================================================================


def comparar_pareadas(df, pre, post, ordinal: bool = False, normalidad: str = "auto", h0=None, h1=None,
                      salida=None, alfa: float = ALFA) -> Resultado:
    a, b = _col(df, pre), _col(df, post)
    d = pd.DataFrame({a: _numerica(df, a), b: _numerica(df, b)})
    excl = int(d.isna().any(axis=1).sum())
    d = d.dropna()
    n = len(d)
    if n < 3:
        raise ValueError(f"Solo hay {n} pares completos; se necesitan al menos 3 (idealmente 10 o más).")
    x1, x2 = d[a].to_numpy(float), d[b].to_numpy(float)
    dif = x2 - x1
    avisos = []
    if excl:
        avisos.append(f"Se excluyeron {excl} caso(s) con dato faltante en {a} o {b} (eliminación por pares).")
    if n < 10:
        avisos.append(f"Solo {n} pares: los resultados son frágiles.")
    nr = test_normalidad(dif, normalidad)
    normal = (not ordinal) and nr["normal"] is True
    supuestos = [f"Normalidad de las diferencias ({b} − {a}) con {nr['prueba']}: {p_norm_txt(nr)}"
                 + (" → normal" if nr["normal"] else " → no normal")]
    if ordinal:
        supuestos.append("Variable declarada ordinal: se usa prueba no paramétrica.")
    s1, s2 = desc_serie(x1), desc_serie(x2)
    tablas, notas = {}, {}
    if normal:
        md, sd = dif.mean(), dif.std(ddof=1)
        se = sd / math.sqrt(n)
        t = md / se if se > 0 else np.nan
        gl = n - 1
        p = float(2 * stats.t.sf(abs(t), gl))
        tc = stats.t.ppf(0.975, gl)
        dz = md / sd if sd > 0 else np.nan
        prueba = "t de Student para muestras relacionadas"
        tablas["Comparación"] = pd.DataFrame([{"Prueba": prueba, "t": t, "gl": gl, "p": p, "Dif. de medias": md,
                                               "IC 95% inf.": md - tc * se, "IC 95% sup.": md + tc * se,
                                               "d de Cohen": dz}])
        notas["Comparación"] = ("Nota. Diferencia = medición final − medición inicial; d de Cohen = diferencia "
                                "media / DE de las diferencias (d_z).")
        sig = p < alfa
        desc1 = f"{a} (*M* = {fnum(s1['M'])}, *DE* = {fnum(s1['DE'])})"
        desc2 = f"{b} (*M* = {fnum(s2['M'])}, *DE* = {fnum(s2['DE'])})"
        estad = (f"*t*({gl}) = {fnum(t)}, {P(p)}, IC 95% de la diferencia [{fnum(md - tc * se)}, "
                 f"{fnum(md + tc * se)}], *d* de Cohen = {fnum(dz)}")
        mag = mag_d(dz)
        razon = "la distribución de las diferencias fue normal"
        efecto = "el tamaño del efecto d de Cohen (d_z)"
        datos = dict(t=t, gl=gl, p=p, dif=md, d=dz)
    else:
        w = wilcoxon_pareado(dif)
        p = w["p"]
        prueba = "Wilcoxon de rangos con signo"
        tablas["Comparación"] = pd.DataFrame([{"Prueba": prueba, "W (rangos positivos)": w["Wp"], "Z": w["z"],
                                               "p": p, "r biserial": w["rbc"], "n (pares sin empate)": w["n"]}])
        notas["Comparación"] = ("Nota. W = suma de rangos de las diferencias positivas (final > inicial); "
                                "r biserial = (W⁺ − W⁻)/(W⁺ + W⁻).")
        sig = p < alfa
        desc1 = f"{a} (*Mdn* = {fnum(s1['Mdn'])}, *RIC* = {fnum(s1['RIC'])})"
        desc2 = f"{b} (*Mdn* = {fnum(s2['Mdn'])}, *RIC* = {fnum(s2['RIC'])})"
        estad = f"*Z* = {fnum(w['z'])}, {P(p)}, *r* biserial = {fnum(w['rbc'], 2, True)}"
        mag = mag_r(w["rbc"])
        razon = "ordinal" if ordinal else "las diferencias no siguieron una distribución normal"
        razon = "la variable es de naturaleza ordinal" if ordinal else "no se cumplió la normalidad de las diferencias"
        efecto = "el tamaño del efecto r biserial de rangos"
        datos = dict(Wp=w["Wp"], z=w["z"], p=p, rbc=w["rbc"])
    h0 = h0 or f"No existen diferencias estadísticamente significativas entre {a} y {b}."
    h1 = h1 or f"Existen diferencias estadísticamente significativas entre {a} y {b}."
    decision = decision_txt(p, alfa)
    concl = ("Por tanto, se rechaza la hipótesis nula." if sig else
             "Por tanto, no se rechaza la hipótesis nula: no se halló evidencia suficiente de cambio.")
    cambio = float(dif.mean() if normal else np.median(dif))
    sentido = (f" Entre {a} y {b} se observó un {'aumento' if cambio > 0 else 'descenso'} "
               f"({'media' if normal else 'mediana'} de las diferencias = {fnum(cambio)}).") if sig else ""
    parrafo = (f"Se aplicó la prueba {prueba} (*n* = {n} pares) para comparar {desc1} con {desc2}. "
               f"Los resultados {'evidencian' if sig else 'no evidencian'} una diferencia estadísticamente "
               f"significativa, {estad}, lo que corresponde a un tamaño del efecto {mag}.{sentido} {concl}")
    metodo = (f"Se evaluó la normalidad de las diferencias entre {b} y {a} mediante la prueba de {nr['prueba']}. "
              f"Dado que {razon}, se empleó la prueba {prueba}, junto con {efecto}. "
              f"Se adoptó un nivel de significancia de α = {fnum(alfa, 2, True)}.")
    # figura: líneas por caso (n ≤ 40) o cajas
    if n <= 40:
        estilo_graficos()
        fig, ax = plt.subplots(figsize=(3.8, 4.2))
        for u, v in zip(x1, x2):
            ax.plot([1, 2], [u, v], color=MUDO, alpha=0.45, linewidth=0.8, zorder=2)
        ax.scatter([1] * n, x1, s=16, color=CAT[0], zorder=3)
        ax.scatter([2] * n, x2, s=16, color=CAT[1], zorder=3)
        ax.plot([1, 2], [x1.mean(), x2.mean()], color=TINTA, linewidth=2, marker="D", markerfacecolor="white",
                markeredgecolor=TINTA, markersize=7, zorder=4)
        ax.set_xticks([1, 2])
        ax.set_xticklabels([a, b])
        ax.set_xlim(0.6, 2.4)
        ax.grid(axis="x", visible=False)
        ax.set_ylabel("Puntaje")
        figura = guardar_fig(fig, salida, f"pareadas_{_slug(a)}_{_slug(b)}")
    else:
        figura = fig_cajas([x1, x2], [a, b], "Puntaje", salida, f"pareadas_{_slug(a)}_{_slug(b)}")
    tablas = {"Estadísticos descriptivos": pd.DataFrame([
        {"Medición": a, "n": s1["n"], "M": s1["M"], "DE": s1["DE"], "Mdn": s1["Mdn"], "RIC": s1["RIC"]},
        {"Medición": b, "n": s2["n"], "M": s2["M"], "DE": s2["DE"], "Mdn": s2["Mdn"], "RIC": s2["RIC"]}]),
        **tablas}
    res = Resultado(id=f"pareadas_{_slug(a)}_{_slug(b)}", titulo=f"Comparación de {a} y {b} (muestras relacionadas)",
                    prueba=prueba, h0=h0, h1=h1, decision=decision, tablas=tablas, notas_tabla=notas,
                    figuras=[figura], pies_figura=[f"Cambio de {a} a {b} (cada línea es un participante; "
                                                   "el rombo es la media)" if n <= 40 else f"Distribución de {a} y {b}"],
                    parrafo=parrafo, metodo=metodo, supuestos=supuestos, avisos=avisos)
    res.datos = {"p": p, "prueba": prueba, "n": n, "normalidad": nr, **datos}
    return res
