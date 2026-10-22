# -*- coding: utf-8 -*-
"""
ts_modelos.py — Regresión lineal múltiple y regresión logística binaria, con verificación de supuestos.
"""
from __future__ import annotations

import math
import warnings

import numpy as np
import pandas as pd
from scipy import stats

from ts_base import (ALFA, CAT, EJE, MUDO, TINTA, TINTA2, Resultado, _col, _etq, _niveles, _slug,
                     decision_txt, estilo_graficos, fnum, fp_valor, guardar_fig, mag_r2, P, p_norm_txt,
                     test_normalidad, plt)


def construir_X(d: pd.DataFrame, xs: list, referencia: dict | None = None):
    """Arma la matriz de predictores. Variables de texto/categóricas → indicadoras (dummies) con categoría de referencia."""
    referencia = referencia or {}
    X = pd.DataFrame(index=d.index)
    notas = []
    for v in xs:
        s = d[v]
        if pd.api.types.is_bool_dtype(s):
            X[v] = s.astype(float)
        elif pd.api.types.is_numeric_dtype(s):
            X[v] = s.astype(float)
        else:
            niv = _niveles(s)
            ref = _etq(referencia.get(v, niv[0]))
            if ref not in niv:
                raise ValueError(f"La categoría de referencia '{ref}' no existe en '{v}'. Niveles: {', '.join(niv)}")
            ss = s.map(_etq)
            for n in niv:
                if n != ref:
                    X[f"{v} [{n}]"] = (ss == n).astype(float)
            notas.append(f"'{v}' es categórica: se codificó con indicadoras; categoría de referencia = «{ref}».")
    return X, notas


def _vif(Xc: pd.DataFrame) -> dict:
    from statsmodels.stats.outliers_influence import variance_inflation_factor
    out = {}
    cols = [c for c in Xc.columns if c != "const"]
    if len(cols) < 2:
        return {c: 1.0 for c in cols}
    for i, c in enumerate(Xc.columns):
        if c != "const":
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                out[c] = float(variance_inflation_factor(Xc.values, i))
    return out


# ============================================================================
# REGRESIÓN LINEAL (simple o múltiple)
# ============================================================================


def regresion_lineal(df, y, x, robusto: str = "auto", normalidad: str = "auto", referencia=None,
                     h0=None, h1=None, salida=None, alfa: float = ALFA) -> Resultado:
    """
    Regresión lineal por MCO. Verifica: normalidad de residuos, homocedasticidad (Breusch-Pagan),
    multicolinealidad (VIF), independencia (Durbin-Watson) y casos influyentes (Cook).
    robusto='auto' usa errores estándar HC3 si Breusch-Pagan detecta heterocedasticidad.
    """
    import statsmodels.api as sm
    from statsmodels.stats.diagnostic import het_breuschpagan
    from statsmodels.stats.stattools import durbin_watson

    if isinstance(x, str):
        x = [x]
    yn = _col(df, y)
    xs = [_col(df, v) for v in x]
    d = df[[yn] + xs].copy()
    d[yn] = pd.to_numeric(d[yn], errors="coerce")
    d = d.dropna()
    excl = len(df) - len(d)
    X, notas_cod = construir_X(d, xs, referencia)
    n, k = len(d), X.shape[1]
    if n <= k + 2:
        raise ValueError(f"Hay {n} casos completos para {k} predictor(es): no alcanzan para estimar el modelo.")
    if d[yn].nunique() < 2:
        raise ValueError(f"'{yn}' es constante: no hay nada que explicar.")
    Xc = sm.add_constant(X.astype(float), has_constant="add")
    mod = sm.OLS(d[yn].astype(float), Xc)
    res_ols = mod.fit()
    avisos = list(notas_cod)
    if excl:
        avisos.append(f"Se excluyeron {excl} caso(s) con datos faltantes (eliminación por lista).")
    minimo = 50 + 8 * k
    if n < minimo:
        avisos.append(f"Con {k} predictor(es) se recomienda n ≥ {minimo} (regla de Green, 1991: 50 + 8k); "
                      f"tienes n = {n}. Interpreta con cautela.")
    # --- supuestos
    resid = res_ols.resid
    nr = test_normalidad(resid, normalidad)
    bp_p = float(het_breuschpagan(resid, Xc)[1])
    dw = float(durbin_watson(resid))
    vif = _vif(Xc)
    cook = res_ols.get_influence().cooks_distance[0]
    n_infl = int((cook > 4 / n).sum())
    vif_max = max(vif.values()) if vif else 1.0
    supuestos = [
        f"Normalidad de los residuos ({nr['prueba']}): {p_norm_txt(nr)}" + (" → normal" if nr["normal"] else " → no normal"),
        f"Homocedasticidad (Breusch-Pagan): {P(bp_p)}" + (" → varianza constante" if bp_p > alfa else " → heterocedasticidad"),
        f"Multicolinealidad (VIF máximo): {fnum(vif_max)}" + (" → adecuada (< 5)" if vif_max < 5 else
                                                              " → moderada (5–10)" if vif_max < 10 else " → GRAVE (> 10)"),
        f"Independencia de residuos (Durbin-Watson): {fnum(dw)}" + (" → aceptable (1.5–2.5)" if 1.5 <= dw <= 2.5 else " → revisar"),
        f"Casos influyentes (distancia de Cook > 4/n): {n_infl}",
    ]
    if nr["normal"] is False:
        avisos.append("Los residuos no son normales: con n grande el modelo es robusto, pero con n pequeño interpreta con cautela.")
    if vif_max >= 5:
        avisos.append("Hay multicolinealidad (VIF ≥ 5): considera quitar o combinar predictores muy correlacionados.")
    if not (1.5 <= dw <= 2.5):
        avisos.append("Durbin-Watson fuera de 1.5–2.5: posible autocorrelación (común en series de tiempo o datos agrupados).")
    if n_infl > 0.05 * n:
        avisos.append(f"{n_infl} casos influyentes (> 5% de la muestra): revisa si hay errores de digitación.")
    usar_robusto = (robusto is True) or (robusto == "auto" and bp_p <= alfa)
    res = mod.fit(cov_type="HC3", use_t=True) if usar_robusto else res_ols
    if usar_robusto:
        avisos.append("Se usaron errores estándar robustos HC3 (heterocedasticidad). El F y los p de los coeficientes son robustos.")
    # --- tablas
    ci = res.conf_int(alpha=alfa)
    sd_y = d[yn].astype(float).std(ddof=1)
    filas = []
    for c in Xc.columns:
        sx = 0.0 if c == "const" else float(Xc[c].std(ddof=1))
        b = float(res.params[c])
        beta = np.nan if c == "const" else b * sx / sd_y
        filas.append({"Variable": "Constante" if c == "const" else c, "B": b, "EE": float(res.bse[c]), "β": beta,
                      "t": float(res.tvalues[c]), "p": float(res.pvalues[c]),
                      "IC 95% inf.": float(ci.loc[c, 0]), "IC 95% sup.": float(ci.loc[c, 1]),
                      "VIF": np.nan if c == "const" else vif.get(c, np.nan)})
    t_coef = pd.DataFrame(filas)
    r2, r2a = float(res.rsquared), float(res.rsquared_adj)
    gl1, gl2 = int(res.df_model), int(res.df_resid)
    F, pF = float(res.fvalue), float(res.f_pvalue)
    ee_est = math.sqrt(float(res_ols.mse_resid))
    t_mod = pd.DataFrame([{"R": math.sqrt(r2), "R²": r2, "R² aj.": r2a, "EE de la estimación": ee_est,
                           "F": F, "gl1": gl1, "gl2": gl2, "p": pF, "Durbin-Watson": dw}])
    sigm = pF < alfa
    h0 = h0 or f"Los predictores ({', '.join(xs)}) no explican de manera significativa la variabilidad de {yn} (R² = 0)."
    h1 = h1 or f"Al menos un predictor ({', '.join(xs)}) explica de manera significativa la variabilidad de {yn} (R² > 0)."
    decision = decision_txt(pF, alfa, "prueba F del modelo global")
    tipo = "simple" if k == 1 else "múltiple"
    parrafo = (f"Se ajustó un modelo de regresión lineal {tipo} para explicar {yn} a partir de "
               f"{', '.join(xs)} (*n* = {n}). El modelo {'resultó' if sigm else 'no resultó'} estadísticamente significativo, "
               f"*F*({gl1}, {gl2}) = {fnum(F)}, {P(pF)}, y explicó el {fnum(100 * r2, 1)}% de la varianza de {yn} "
               f"(*R*² = {fnum(r2, 2, True)}; *R*² ajustado = {fnum(r2a, 2, True)}), un efecto {mag_r2(r2)}. ")
    pred = t_coef[t_coef["Variable"] != "Constante"]
    sg = pred[pred["p"] < alfa]
    if sigm and len(sg):
        det = "; ".join(f"{r_['Variable']} (*B* = {fnum(r_['B'], 2 if abs(r_['B']) >= 0.1 else 3)}, *β* = {fnum(r_['β'], 2, True)}, "
                        f"{P(r_['p'])})" for _, r_ in sg.iterrows())
        parrafo += f"Los predictores con efecto estadísticamente significativo fueron: {det}. "
        mayor = sg.reindex(sg["β"].abs().sort_values(ascending=False).index).iloc[0]
        parrafo += (f"Por cada unidad adicional en {mayor['Variable']}, {yn} {'aumenta' if mayor['B'] > 0 else 'disminuye'} "
                    f"en promedio {fnum(abs(mayor['B']), 2 if abs(mayor['B']) >= 0.1 else 3)} unidades, manteniendo constantes los demás predictores. "
                    "Por tanto, se rechaza la hipótesis nula.")
    elif sigm:
        parrafo += ("Ningún predictor individual alcanzó significancia estadística por sí solo, lo que puede deberse a "
                    "la colinealidad entre ellos. Por tanto, se rechaza la hipótesis nula del modelo global.")
    else:
        parrafo += "Por tanto, no se rechaza la hipótesis nula: el modelo no explica la variabilidad de " + yn + " por encima del azar."
    metodo = (f"Se estimó un modelo de regresión lineal {tipo} por mínimos cuadrados ordinarios. Se verificaron los supuestos de "
              f"normalidad de los residuos ({nr['prueba']}), homocedasticidad (Breusch-Pagan), ausencia de multicolinealidad "
              f"(factor de inflación de la varianza, VIF), independencia de los errores (Durbin-Watson) y casos influyentes "
              f"(distancia de Cook)." + (" Ante heterocedasticidad se emplearon errores estándar robustos HC3." if usar_robusto else "")
              + f" El tamaño del efecto se evaluó con R² (criterios de Cohen, 1988: .02, .13 y .26). Nivel de significancia α = {fnum(alfa, 2, True)}.")
    # --- figuras: diagnóstico + coeficientes
    estilo_graficos()
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(8.4, 3.8))
    ajust = np.asarray(res_ols.fittedvalues)
    a1.scatter(ajust, resid, s=16, color=CAT[0], alpha=0.6, edgecolors="white", linewidths=0.4)
    a1.axhline(0, color=TINTA, linewidth=1)
    a1.set_xlabel("Valores ajustados")
    a1.set_ylabel("Residuos")
    (osm, osr), (sl, ic_, _) = stats.probplot(np.asarray(resid), dist="norm")
    a2.scatter(osm, osr, s=16, color=CAT[0], alpha=0.6, edgecolors="white", linewidths=0.4)
    a2.plot(osm, sl * np.asarray(osm) + ic_, color=TINTA, linewidth=1)
    a2.set_xlabel("Cuantiles teóricos")
    a2.set_ylabel("Cuantiles de los residuos")
    a2.grid(axis="x", visible=True)
    fig.tight_layout()
    f_diag = guardar_fig(fig, salida, f"regresion_diagnostico_{_slug(yn)}")
    figs, pies = [f_diag], ["Diagnóstico del modelo: residuos vs. valores ajustados (izquierda) y gráfico Q-Q de los residuos (derecha)"]
    pr = pred.reset_index(drop=True)
    if len(pr):
        sx_ = np.array([float(Xc[c].std(ddof=1)) for c in Xc.columns if c != "const"])
        lo = ci.loc[[c for c in Xc.columns if c != "const"], 0].to_numpy() * sx_ / sd_y
        hi = ci.loc[[c for c in Xc.columns if c != "const"], 1].to_numpy() * sx_ / sd_y
        fig, ax = plt.subplots(figsize=(5.8, max(2.2, 0.55 * len(pr) + 1.2)))
        ypos = np.arange(len(pr))[::-1]
        ax.hlines(ypos, lo, hi, color=CAT[0], linewidth=1.6)
        ax.scatter(pr["β"], ypos, s=36, color=CAT[0], zorder=3, edgecolors="white", linewidths=0.8)
        ax.axvline(0, color=TINTA, linewidth=1)
        ax.set_yticks(ypos)
        ax.set_yticklabels(pr["Variable"])
        ax.set_xlabel("Coeficiente estandarizado β (IC 95%)")
        ax.grid(axis="y", visible=False)
        ax.grid(axis="x", visible=True)
        figs.append(guardar_fig(fig, salida, f"regresion_coeficientes_{_slug(yn)}"))
        pies.append("Coeficientes estandarizados (β) con intervalo de confianza al 95%")
    out = Resultado(id=f"regresion_{_slug(yn)}", titulo=f"Regresión lineal {tipo}: {yn}",
                    prueba=f"Regresión lineal {tipo} por mínimos cuadrados ordinarios" + (" (errores robustos HC3)" if usar_robusto else ""),
                    h0=h0, h1=h1, decision=decision,
                    tablas={"Resumen del modelo": t_mod, "Coeficientes de regresión": t_coef},
                    notas_tabla={"Coeficientes de regresión": "Nota. B = coeficiente no estandarizado; EE = error estándar; β = coeficiente "
                                                              "estandarizado; IC = intervalo de confianza al 95% de B; VIF = factor de inflación de la varianza.",
                                 "Resumen del modelo": "Nota. R² aj. = R² ajustado."},
                    figuras=figs, pies_figura=pies, parrafo=parrafo, metodo=metodo, supuestos=supuestos, avisos=avisos)
    out.datos = dict(r2=r2, r2_aj=r2a, F=F, p=pF, gl1=gl1, gl2=gl2, n=n, coef=t_coef, bp_p=bp_p, dw=dw, vif=vif,
                     robusto=usar_robusto, params=res.params.to_dict(), pvalues=res.pvalues.to_dict())
    return out


# ============================================================================
# REGRESIÓN LOGÍSTICA BINARIA
# ============================================================================


def hosmer_lemeshow(y, prob, grupos: int = 10) -> tuple:
    d = pd.DataFrame({"y": np.asarray(y, float), "p": np.asarray(prob, float)})
    d["g"] = pd.qcut(d["p"], grupos, duplicates="drop")
    g = d.groupby("g", observed=True)
    obs1, esp1, n = g["y"].sum(), g["p"].sum(), g["y"].count()
    pm = esp1 / n
    chi = float((((obs1 - esp1) ** 2) / (n * pm * (1 - pm))).sum())
    gl = len(n) - 2
    return chi, gl, float(stats.chi2.sf(chi, gl)) if gl > 0 else np.nan


def regresion_logistica(df, y, x, evento=None, referencia=None, h0=None, h1=None, salida=None,
                        alfa: float = ALFA) -> Resultado:
    """Regresión logística binaria: OR con IC 95%, ómnibus (razón de verosimilitud), R² de Nagelkerke, Hosmer-Lemeshow, AUC."""
    import statsmodels.api as sm
    from statsmodels.tools.sm_exceptions import PerfectSeparationError

    if isinstance(x, str):
        x = [x]
    yn = _col(df, y)
    xs = [_col(df, v) for v in x]
    d = df[[yn] + xs].dropna().copy()
    niv = _niveles(d[yn])
    if len(niv) != 2:
        raise ValueError(f"'{yn}' debe tener exactamente 2 categorías; tiene {len(niv)}: {', '.join(niv)}.")
    ev = _etq(evento) if evento is not None else niv[1]
    if ev not in niv:
        raise ValueError(f"El evento '{ev}' no existe en '{yn}'. Niveles: {', '.join(niv)}")
    no_ev = [v for v in niv if v != ev][0]
    yb = (d[yn].map(_etq) == ev).astype(float)
    X, notas_cod = construir_X(d, xs, referencia)
    n, k = len(d), X.shape[1]
    eventos, no_eventos = int(yb.sum()), int((1 - yb).sum())
    avisos = list(notas_cod)
    avisos.append(f"Variable dependiente: se modela la probabilidad de «{ev}» (evento = 1); categoría de comparación: «{no_ev}».")
    epv = min(eventos, no_eventos) / k
    if epv < 10:
        avisos.append(f"Eventos por variable (EPV) = {fnum(epv, 1)} (< 10): el modelo puede ser inestable; reduce predictores o aumenta la muestra.")
    Xc = sm.add_constant(X.astype(float), has_constant="add")
    try:
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            res = sm.Logit(yb, Xc).fit(disp=0, maxiter=200)
        if any("converge" in str(m.message).lower() for m in w):
            avisos.append("El algoritmo no convergió del todo: revisa colinealidad o separación de los datos.")
    except (PerfectSeparationError, np.linalg.LinAlgError) as e:
        raise ValueError("El modelo no se pudo estimar: hay separación perfecta o colinealidad extrema "
                         "(un predictor 'adivina' el resultado). Quita o agrupa ese predictor.") from e
    ll, ll0 = float(res.llf), float(res.llnull)
    lr = 2 * (ll - ll0)
    gl = int(res.df_model)
    p_lr = float(stats.chi2.sf(lr, gl))
    cs = 1 - math.exp(2 * (ll0 - ll) / n)
    nag = cs / (1 - math.exp(2 * ll0 / n))
    prob = res.predict(Xc).to_numpy()
    hl_chi, hl_gl, hl_p = hosmer_lemeshow(yb, prob)
    pred = (prob >= 0.5).astype(float)
    acc = float((pred == yb).mean())
    sens = float(((pred == 1) & (yb == 1)).sum() / max(eventos, 1))
    espc = float(((pred == 0) & (yb == 0)).sum() / max(no_eventos, 1))
    auc = float(stats.mannwhitneyu(prob[yb == 1], prob[yb == 0]).statistic / (eventos * no_eventos))
    ci = res.conf_int(alpha=alfa)
    filas = []
    for c in Xc.columns:
        b, se = float(res.params[c]), float(res.bse[c])
        filas.append({"Variable": "Constante" if c == "const" else c, "B": b, "EE": se, "Wald": (b / se) ** 2,
                      "gl": 1, "p": float(res.pvalues[c]), "OR": math.exp(b),
                      "IC 95% inf. (OR)": math.exp(float(ci.loc[c, 0])), "IC 95% sup. (OR)": math.exp(float(ci.loc[c, 1]))})
    t_coef = pd.DataFrame(filas)
    t_mod = pd.DataFrame([{"χ² (razón de verosimilitud)": lr, "gl": gl, "p": p_lr, "−2LL": -2 * ll,
                           "R² Cox y Snell": cs, "R² Nagelkerke": nag, "Hosmer-Lemeshow χ²": hl_chi,
                           "p HL": hl_p, "% clasificación correcta": 100 * acc, "AUC": auc}])
    sigm = p_lr < alfa
    h0 = h0 or f"Los predictores no mejoran la predicción de {yn} respecto al modelo sin predictores."
    h1 = h1 or f"Al menos un predictor mejora significativamente la predicción de {yn}."
    decision = decision_txt(p_lr, alfa, "prueba ómnibus de razón de verosimilitud")
    parrafo = (f"Se ajustó un modelo de regresión logística binaria para predecir la probabilidad de {yn} = «{ev}» a partir de "
               f"{', '.join(xs)} (*N* = {n}; {eventos} casos con el evento). El modelo {'fue' if sigm else 'no fue'} estadísticamente "
               f"significativo, *χ*²({gl}, *N* = {n}) = {fnum(lr)}, {P(p_lr)}, y explicó entre el {fnum(100 * cs, 1)}% (*R*² de Cox y Snell) "
               f"y el {fnum(100 * nag, 1)}% (*R*² de Nagelkerke) de la variabilidad. La prueba de Hosmer-Lemeshow indicó "
               f"{'buen' if hl_p > alfa else 'un mal'} ajuste, *χ*²({hl_gl}) = {fnum(hl_chi)}, {P(hl_p)}. El modelo clasificó correctamente "
               f"el {fnum(100 * acc, 1)}% de los casos (sensibilidad = {fnum(100 * sens, 1)}%; especificidad = {fnum(100 * espc, 1)}%; "
               f"AUC = {fnum(auc, 2, True)}). ")
    pr = t_coef[t_coef["Variable"] != "Constante"]
    sg = pr[pr["p"] < alfa]
    if len(sg):
        det = "; ".join(f"{r_['Variable']} (OR = {fnum(r_['OR'])}, IC 95% [{fnum(r_['IC 95% inf. (OR)'])}, {fnum(r_['IC 95% sup. (OR)'])}], {P(r_['p'])})"
                        for _, r_ in sg.iterrows())
        parrafo += (f"Los predictores significativos fueron: {det}. Un OR mayor que 1 indica mayor probabilidad (momios) de «{ev}»; "
                    "menor que 1, menor probabilidad. ")
    else:
        parrafo += "Ningún predictor individual resultó estadísticamente significativo. "
    parrafo += "Por tanto, se rechaza la hipótesis nula del modelo global." if sigm else "Por tanto, no se rechaza la hipótesis nula del modelo global."
    metodo = (f"Dado que la variable dependiente ({yn}) es dicotómica, se empleó regresión logística binaria estimada por máxima "
              f"verosimilitud. La significancia global se evaluó con la prueba de razón de verosimilitud, el ajuste con la prueba de "
              f"Hosmer-Lemeshow y los R² de Cox y Snell y de Nagelkerke, y la capacidad discriminativa con el área bajo la curva ROC (AUC). "
              f"Los efectos se reportaron como razón de momios (odds ratio, OR) con IC al 95%. Nivel de significancia α = {fnum(alfa, 2, True)}.")
    estilo_graficos()
    fig, ax = plt.subplots(figsize=(5.8, max(2.2, 0.55 * len(pr) + 1.2)))
    pr = pr.reset_index(drop=True)
    ypos = np.arange(len(pr))[::-1]
    ax.hlines(ypos, pr["IC 95% inf. (OR)"], pr["IC 95% sup. (OR)"], color=CAT[0], linewidth=1.6)
    ax.scatter(pr["OR"], ypos, s=36, color=CAT[0], zorder=3, edgecolors="white", linewidths=0.8)
    ax.axvline(1, color=TINTA, linewidth=1)
    ax.set_xscale("log")
    from matplotlib.ticker import FuncFormatter, NullFormatter
    lo_, hi_ = float(pr["IC 95% inf. (OR)"].min()), float(pr["IC 95% sup. (OR)"].max())
    ax.set_xlim(lo_ / 1.25, hi_ * 1.25)
    cand = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 4, 5, 10, 20, 50, 100, 200, 500, 1000]
    ticks = [t for t in cand if ax.get_xlim()[0] <= t <= ax.get_xlim()[1]]
    ax.set_xticks(ticks)
    ax.xaxis.set_major_formatter(FuncFormatter(lambda v, _: f"{v:g}"))
    ax.xaxis.set_minor_formatter(NullFormatter())
    ax.set_yticks(ypos)
    ax.set_yticklabels(pr["Variable"])
    ax.set_xlabel("Razón de momios (OR), escala logarítmica, IC 95%")
    ax.grid(axis="y", visible=False)
    ax.grid(axis="x", visible=True)
    figura = guardar_fig(fig, salida, f"logistica_{_slug(yn)}")
    out = Resultado(id=f"logistica_{_slug(yn)}", titulo=f"Regresión logística binaria: {yn}", prueba="Regresión logística binaria",
                    h0=h0, h1=h1, decision=decision,
                    tablas={"Ajuste global del modelo": t_mod, "Coeficientes y razones de momios": t_coef},
                    notas_tabla={"Coeficientes y razones de momios": "Nota. B = coeficiente logit; OR = exp(B); IC = intervalo de confianza al 95% del OR."},
                    figuras=[figura], pies_figura=["Razones de momios (OR) con intervalo de confianza al 95%; la línea vertical marca OR = 1"],
                    parrafo=parrafo, metodo=metodo, supuestos=[f"Eventos por variable (EPV) = {fnum(epv, 1)}" + (" → adecuado (≥ 10)" if epv >= 10 else " → bajo (< 10)"),
                                                                 f"Hosmer-Lemeshow: {P(hl_p)}" + (" → buen ajuste" if hl_p > alfa else " → ajuste deficiente")],
                    avisos=avisos)
    out.datos = dict(lr=lr, gl=gl, p=p_lr, nagelkerke=nag, cox_snell=cs, auc=auc, acc=acc, coef=t_coef, n=n, hl_p=hl_p,
                     params=res.params.to_dict())
    return out
