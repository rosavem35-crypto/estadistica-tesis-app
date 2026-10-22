# -*- coding: utf-8 -*-
"""
ts_base.py — Núcleo común de la skill estadistica-tesis-latam.

Contiene: formato APA 7 en español, carga de datos, pruebas de normalidad,
la clase Resultado (tabla + figura + párrafo + justificación) y el estilo de gráficos.
Todo el texto que ve el usuario está en español.
"""
from __future__ import annotations

import difflib
import math
import os
import re
import unicodedata
import warnings
from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from scipy import stats

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ALFA = 0.05
CONFIG = {"decimal": "."}  # "." o "," (use set_decimal)


def set_decimal(simbolo: str = ".") -> None:
    """Cambia el separador decimal de TODOS los textos generados ('.' o ',')."""
    if simbolo not in (".", ","):
        raise ValueError("El separador decimal debe ser '.' o ','.")
    CONFIG["decimal"] = simbolo


# ----------------------------------------------------------------------------
# Formato numérico (APA 7: sin cero inicial en valores que no pueden pasar de 1)
# ----------------------------------------------------------------------------
def _dec(s: str) -> str:
    return s.replace(".", ",") if CONFIG["decimal"] == "," else s


def fnum(x, d: int = 2, sin_cero: bool = False) -> str:
    """Formatea un número con d decimales. sin_cero=True quita el 0 inicial (.45)."""
    if x is None:
        return "—"
    try:
        if np.isnan(x):
            return "—"
    except TypeError:
        return str(x)
    if np.isinf(x):
        return "∞" if x > 0 else "-∞"
    s = f"{x:.{d}f}"
    if s.startswith("-") and float(s) == 0:
        s = s[1:]  # evita "-0.00"
    if sin_cero:
        s = re.sub(r"^(-?)0\.", r"\1.", s)
    return _dec(s)


def fp_valor(p) -> str:
    """Valor p en APA: '< .001' o '.023' (sin signo igual)."""
    if p is None or (isinstance(p, float) and np.isnan(p)):
        return "—"
    if p < 0.001:
        return _dec("< .001")
    return _dec(f"{p:.3f}".replace("0.", ".", 1)) if p < 1 else _dec("1.000")


def P(p) -> str:
    """'*p* < .001' o '*p* = .023' (cursiva en Markdown)."""
    v = fp_valor(p)
    return f"*p* {v}" if v.startswith("<") else f"*p* = {v}"


def decision_txt(p, alfa: float = 0.05, nota: str = "") -> str:
    """Decisión sobre H₀ en una frase correcta: 'Como p = .024 es menor que α = .05, se rechaza H₀ (nota).'"""
    a = fnum(alfa, 2, True)
    extra = f" ({nota})" if nota else ""
    if p < alfa:
        return f"Como {P(p)} es menor que α = {a}, se rechaza H₀{extra}."
    return f"Como {P(p)} es mayor o igual que α = {a}, no se rechaza H₀{extra}."


def _etq(v) -> str:
    """Etiqueta de grupo: 1.0 -> '1'."""
    if isinstance(v, (float, np.floating)) and float(v).is_integer():
        return str(int(v))
    return str(v)


def _slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Za-z0-9]+", "_", s).strip("_")[:40] or "x"


# ----------------------------------------------------------------------------
# Magnitudes del efecto (convenciones de Cohen, 1988)
# ----------------------------------------------------------------------------
def mag_d(d: float) -> str:
    a = abs(d)
    return "trivial" if a < 0.2 else "pequeño" if a < 0.5 else "mediano" if a < 0.8 else "grande"


def mag_r(r: float) -> str:
    a = abs(r)
    return "trivial" if a < 0.1 else "pequeño" if a < 0.3 else "mediano" if a < 0.5 else "grande"


def fuerza_r(r: float) -> str:
    a = abs(r)
    return ("muy débil (prácticamente nula)" if a < 0.1 else "débil" if a < 0.3
            else "moderada" if a < 0.5 else "fuerte")


def mag_eta(e: float) -> str:
    return "trivial" if e < 0.01 else "pequeño" if e < 0.06 else "mediano" if e < 0.14 else "grande"


def mag_v(v: float, df_min: int = 1) -> str:
    f = math.sqrt(max(df_min, 1))
    return ("trivial" if v < 0.10 / f else "pequeño" if v < 0.30 / f
            else "mediano" if v < 0.50 / f else "grande")


def mag_r2(r2: float) -> str:
    return "trivial" if r2 < 0.02 else "pequeño" if r2 < 0.13 else "mediano" if r2 < 0.26 else "grande"


def mag_alfa(a: float) -> str:
    """Interpretación del alfa de Cronbach (George y Mallery, 2003)."""
    return ("inaceptable" if a < 0.50 else "pobre" if a < 0.60 else "cuestionable" if a < 0.70
            else "aceptable" if a < 0.80 else "buena" if a < 0.90 else "excelente")


# ----------------------------------------------------------------------------
# Carga de datos
# ----------------------------------------------------------------------------
def _es_texto(s: pd.Series) -> bool:
    return (pd.api.types.is_object_dtype(s) or pd.api.types.is_string_dtype(s)
            or isinstance(s.dtype, pd.CategoricalDtype))


def cargar_datos(ruta: str, hoja=0) -> pd.DataFrame:
    """Lee Excel (.xlsx/.xls), CSV/TXT o SPSS (.sav). Convierte decimales con coma."""
    ext = os.path.splitext(ruta)[1].lower()
    if ext in (".xlsx", ".xlsm", ".xls"):
        df = pd.read_excel(ruta, sheet_name=hoja)
    elif ext in (".csv", ".txt", ".tsv"):
        df = None
        for enc in ("utf-8-sig", "latin-1"):
            try:
                df = pd.read_csv(ruta, sep=None, engine="python", encoding=enc)
                break
            except UnicodeDecodeError:
                continue
        if df is None:
            raise ValueError("No pude leer el archivo (codificación desconocida). Guárdalo como CSV UTF-8.")
    elif ext == ".sav":
        try:
            import pyreadstat  # type: ignore
        except ImportError:
            raise ValueError("Para leer .sav hace falta 'pyreadstat'. Alternativa: en SPSS use "
                             "Archivo > Guardar como > Excel y suba ese archivo.")
        df, _ = pyreadstat.read_sav(ruta)
    else:
        raise ValueError(f"Formato '{ext}' no soportado. Use .xlsx, .csv o .sav.")
    df.columns = [str(c).strip() for c in df.columns]
    df = df.dropna(axis=1, how="all").dropna(axis=0, how="all").reset_index(drop=True)
    for c in df.columns:  # "3,5" -> 3.5 (Excel/CSV en español)
        if _es_texto(df[c]) and not isinstance(df[c].dtype, pd.CategoricalDtype):
            s = df[c].dropna().astype(str).str.strip()
            if len(s) == 0:
                continue
            conv = pd.to_numeric(s.str.replace(",", ".", regex=False), errors="coerce")
            if conv.notna().mean() >= 0.95 and s.str.contains(",").any():
                df[c] = pd.to_numeric(df[c].astype(str).str.strip().str.replace(",", ".", regex=False),
                                      errors="coerce")
    return df


def _col(df: pd.DataFrame, nombre) -> str:
    """Resuelve el nombre de una columna (tolera mayúsculas/espacios) o explica el error."""
    if nombre in df.columns:
        return nombre
    mapa = {str(c).strip().lower(): c for c in df.columns}
    k = str(nombre).strip().lower()
    if k in mapa:
        return mapa[k]
    sug = difflib.get_close_matches(str(nombre), [str(c) for c in df.columns], n=3, cutoff=0.5)
    if sug:
        raise ValueError(f"No encuentro la columna '{nombre}'. ¿Quisiste decir: {', '.join(sug)}?")
    raise ValueError(f"No encuentro la columna '{nombre}'. Columnas disponibles: "
                     f"{', '.join(map(str, df.columns))}")


def _numerica(df: pd.DataFrame, nombre: str) -> pd.Series:
    s = pd.to_numeric(df[nombre], errors="coerce")
    if s.notna().sum() == 0:
        raise ValueError(f"La columna '{nombre}' no contiene números. Revise que no sea texto.")
    return s


def _niveles(s: pd.Series) -> list:
    if isinstance(s.dtype, pd.CategoricalDtype):
        return [_etq(c) for c in s.cat.categories if (s == c).any()]
    vals = list(pd.unique(s.dropna()))
    try:
        vals = sorted(vals, key=lambda v: float(v))
    except (TypeError, ValueError):
        vals = sorted(vals, key=str)
    return [_etq(v) for v in vals]


# ----------------------------------------------------------------------------
# Descriptivos y normalidad
# ----------------------------------------------------------------------------
def desc_serie(x) -> dict:
    x = pd.Series(x).dropna().astype(float)
    n = len(x)
    if n == 0:
        return dict(n=0, M=np.nan, DE=np.nan, Mdn=np.nan, Q1=np.nan, Q3=np.nan, RIC=np.nan,
                    Min=np.nan, Max=np.nan, asim=np.nan, curt=np.nan)
    q1, q3 = x.quantile(0.25), x.quantile(0.75)
    return dict(n=n, M=x.mean(), DE=x.std(ddof=1) if n > 1 else np.nan, Mdn=x.median(),
                Q1=q1, Q3=q3, RIC=q3 - q1, Min=x.min(), Max=x.max(),
                asim=x.skew() if n > 2 else np.nan, curt=x.kurt() if n > 3 else np.nan)


def atipicos_iqr(x) -> int:
    x = pd.Series(x).dropna().astype(float)
    if len(x) < 4:
        return 0
    q1, q3 = x.quantile(0.25), x.quantile(0.75)
    i = q3 - q1
    return int(((x < q1 - 1.5 * i) | (x > q3 + 1.5 * i)).sum())


def test_normalidad(x, metodo: str = "auto") -> dict:
    """
    Normalidad. metodo='auto': Shapiro-Wilk si n < 50 y Kolmogorov-Smirnov con corrección de
    Lilliefors si n >= 50 (convención de SPSS y de la mayoría de tesis). 'shapiro' o 'ks' fuerzan.
    """
    x = np.asarray(pd.Series(x).dropna(), dtype=float)
    n = len(x)
    base = dict(n=n, prueba=None, estadistico=np.nan, p=np.nan, normal=None, nota="")
    if n < 3:
        base["nota"] = "n < 3: no se puede evaluar la normalidad"
        return base
    if np.ptp(x) == 0:
        base.update(prueba="—", normal=False, nota="variable constante (sin variabilidad)")
        return base
    usar_shapiro = metodo == "shapiro" or (metodo == "auto" and n < 50)
    if usar_shapiro:
        w, p = stats.shapiro(x)
        base.update(prueba="Shapiro-Wilk", estadistico=float(w), p=float(p))
    else:
        from statsmodels.stats.diagnostic import lilliefors
        d, p = lilliefors(x, dist="norm", pvalmethod="table")
        base.update(prueba="Kolmogorov-Smirnov (Lilliefors)", estadistico=float(d), p=float(p))
    base["normal"] = bool(base["p"] > ALFA)
    return base


def p_norm_txt(r: dict) -> str:
    if r["prueba"] is None or np.isnan(r["p"]):
        return r.get("nota", "no evaluable")
    if r["prueba"].startswith("Kolmogorov") and r["p"] >= 0.2:
        return _dec("*p* > .20")
    return P(r["p"])


# ----------------------------------------------------------------------------
# Resultado: lo que entrega cada análisis
# ----------------------------------------------------------------------------
@dataclass
class Resultado:
    id: str
    titulo: str
    prueba: str = ""
    h0: str = ""
    h1: str = ""
    decision: str = ""
    tablas: dict = field(default_factory=dict)       # nombre -> DataFrame
    notas_tabla: dict = field(default_factory=dict)  # nombre -> nota APA ("Nota. ...")
    figuras: list = field(default_factory=list)      # rutas PNG
    pies_figura: list = field(default_factory=list)  # títulos de figura
    parrafo: str = ""                                # redacción de resultados (APA, español)
    metodo: str = ""                                 # redacción para el capítulo de método
    supuestos: list = field(default_factory=list)    # líneas de verificación de supuestos
    avisos: list = field(default_factory=list)       # advertencias para el investigador
    datos: dict = field(default_factory=dict)        # números crudos (para verificar)

    # -- salida en Markdown ---------------------------------------------------
    def a_markdown(self, n_tabla: int = 1, n_fig: int = 1):
        L = [f"## {self.titulo}", ""]
        if self.prueba:
            L += [f"**Prueba aplicada:** {self.prueba}", ""]
        if self.supuestos:
            L += ["**Verificación de supuestos**", ""] + [f"- {s}" for s in self.supuestos] + [""]
        if self.h0 or self.h1:
            L += ["**Hipótesis estadísticas**", "",
                  f"- H₀: {self.h0}", f"- H₁: {self.h1}", f"- Decisión: {self.decision}", ""]
        for nombre, df in self.tablas.items():
            L += [f"**Tabla {n_tabla}.** *{nombre}*", "", tabla_md(df)]
            nota = self.notas_tabla.get(nombre)
            if nota:
                L += ["", f"*{nota.replace('*', chr(92) + '*')}*"]
            L.append("")
            n_tabla += 1
        for ruta, pie in zip(self.figuras, self.pies_figura or [""] * len(self.figuras)):
            L += [f"**Figura {n_fig}.** *{pie}*", "", f"![Figura {n_fig}]({os.path.basename(ruta)})", ""]
            n_fig += 1
        if self.parrafo:
            L += ["**Redacción de resultados (lista para tu tesis o artículo)**", "", self.parrafo, ""]
        if self.metodo:
            L += ["**Justificación para el capítulo de método**", "", self.metodo, ""]
        if self.avisos:
            L += ["**Advertencias**", ""] + [f"- {a}" for a in self.avisos] + [""]
        return "\n".join(L), n_tabla, n_fig


_SIN_CERO = {"r", "ρ", "R", "R²", "R² aj.", "η²", "ε²", "V", "V de Cramér", "φ", "β", "r biserial", "AUC",
             "R² Cox y Snell", "R² Nagelkerke", "R² McFadden", "R² (varianza compartida)"}


def _decimales_col(df: pd.DataFrame, col) -> int:
    """Decimales comunes de una columna (APA pide consistencia): 2 salvo que haya valores muy pequeños."""
    vals = []
    for i, v in enumerate(df[col]):
        if i == 0 or str(df.iloc[i, 0]) != "Constante":
            if isinstance(v, (float, np.floating)) and not np.isnan(v) and v != 0:
                vals.append(abs(float(v)))
    if not vals:
        return 2
    m = min(vals)
    return 4 if m < 0.001 else 3 if m < 0.01 else 2


def _fmt_celda(col, v, d_col: int = 2) -> str:
    if isinstance(v, str):
        return v
    if v is None:
        return ""
    if isinstance(v, (bool, np.bool_)):
        return "Sí" if v else "No"
    if isinstance(v, (int, np.integer)):
        return str(int(v))
    if isinstance(v, (float, np.floating)):
        if np.isnan(v):
            return ""
        c = str(col)
        if c == "p" or c.startswith("p "):
            return fp_valor(float(v))
        if c in _SIN_CERO or c.endswith("(r)"):
            return fnum(float(v), 2, sin_cero=True)
        if c in ("gl", "gl1", "gl2") and float(v).is_integer():
            return str(int(v))
        return fnum(float(v), d_col)
    return str(v)


def tabla_formateada(df: pd.DataFrame) -> list:
    """Lista de listas de texto ya formateado (encabezado + filas) para pegar en un informe."""
    decs = {c: _decimales_col(df, c) for c in df.columns}
    filas = [[str(c) for c in df.columns]]
    for _, fila in df.iterrows():
        filas.append([_fmt_celda(c, fila[c], decs[c]) for c in df.columns])
    return filas


def tabla_md(df: pd.DataFrame) -> str:
    f = tabla_formateada(df)
    out = ["| " + " | ".join(f[0]) + " |", "|" + "|".join(["---"] * len(f[0])) + "|"]
    out += ["| " + " | ".join(x) + " |" for x in f[1:]]
    return "\n".join(out)


# ----------------------------------------------------------------------------
# Gráficos (paleta validada del sistema de visualización: azul/naranja/aqua...)
# ----------------------------------------------------------------------------
CAT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"]
TINTA, TINTA2, MUDO, GRILLA, EJE = "#0b0b0b", "#52514e", "#898781", "#e1e0d9", "#c3c2b7"
NEUTRO = "#f0efec"


def estilo_graficos() -> None:
    plt.rcParams.update({
        "font.family": "sans-serif",
        "font.sans-serif": ["Arial", "Liberation Sans", "DejaVu Sans"],
        "font.size": 10, "text.color": TINTA,
        "axes.edgecolor": EJE, "axes.labelcolor": TINTA2, "axes.linewidth": 0.8,
        "xtick.color": TINTA2, "ytick.color": TINTA2,
        "axes.spines.top": False, "axes.spines.right": False,
        "axes.grid": True, "axes.grid.axis": "y", "grid.color": GRILLA, "grid.linewidth": 0.6,
        "axes.axisbelow": True, "figure.facecolor": "white", "axes.facecolor": "white",
        "savefig.dpi": 300, "savefig.bbox": "tight", "legend.frameon": False,
    })


def _carpeta(salida: str | None) -> str:
    salida = salida or "resultados_estadistica"
    os.makedirs(salida, exist_ok=True)
    return salida


def guardar_fig(fig, salida: str | None, nombre: str) -> str:
    ruta = os.path.join(_carpeta(salida), f"fig_{nombre}.png")
    fig.savefig(ruta)
    plt.close(fig)
    return ruta


def _tinte(hex_color: str, alpha: float = 0.18):
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return (r, g, b, alpha)


def fig_cajas(arrs, etiquetas, ylabel, salida, nombre, colores=None, seed=7):
    """Cajas + puntos individuales + media (rombo). Identidad por eje, no por color."""
    estilo_graficos()
    k = len(arrs)
    fig, ax = plt.subplots(figsize=(max(3.6, 1.5 * k + 1.8), 4.2))
    colores = colores or ([CAT[0], CAT[1]] if k == 2 else [CAT[0]] * k)
    rng = np.random.default_rng(seed)
    bp = ax.boxplot(arrs, widths=0.5, patch_artist=True, showfliers=False, positions=range(1, k + 1))
    for i, caja in enumerate(bp["boxes"]):
        caja.set(facecolor=_tinte(colores[i]), edgecolor=colores[i], linewidth=1.2)
    for m in bp["medians"]:
        m.set(color=TINTA, linewidth=1.6)
    for w in bp["whiskers"] + bp["caps"]:
        w.set(color=MUDO, linewidth=1)
    for i, a in enumerate(arrs, start=1):
        a = np.asarray(a, float)
        ax.scatter(i + rng.uniform(-0.14, 0.14, len(a)), a, s=14, color=colores[i - 1], alpha=0.55,
                   linewidths=0.4, edgecolors="white", zorder=3)
        ax.scatter([i], [np.mean(a)], marker="D", s=46, color="white", edgecolors=TINTA, linewidths=1.2, zorder=4)
    ax.set_xticks(range(1, k + 1))
    ax.set_xticklabels([f"{e}\n(n = {len(a)})" for e, a in zip(etiquetas, arrs)])
    ax.set_ylabel(ylabel)
    ax.grid(axis="x", visible=False)
    from matplotlib.lines import Line2D
    ax.legend(handles=[Line2D([0], [0], marker="D", color="none", markerfacecolor="white", markeredgecolor=TINTA,
                              markersize=6, label="Media"),
                       Line2D([0], [0], color=TINTA, linewidth=1.6, label="Mediana")],
              loc="upper center", bbox_to_anchor=(0.5, -0.22 if k > 2 else -0.2), ncol=2, fontsize=8.5,
              handlelength=1.4, columnspacing=1.4)
    return guardar_fig(fig, salida, nombre)


def prep_df_numerico(df, cols):
    return pd.concat([_numerica(df, c).rename(c) for c in cols], axis=1)
