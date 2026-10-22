#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tesis_stats.py — Análisis estadístico para tesis y artículos científicos (español, APA 7).

Uso como biblioteca:
    import sys; sys.path.insert(0, "scripts")
    from tesis_stats import *
    df = cargar_datos("mis_datos.xlsx")
    inf = Informe("Resultados de mi tesis", salida="resultados")
    inf.agregar(perfil_datos(df, salida="resultados"))
    inf.agregar(comparar_grupos(df, y="postest", grupo="grupo", salida="resultados"))
    inf.guardar()                      # informe.docx + tablas.xlsx + informe.md

Uso desde la terminal (un análisis por llamada):
    python tesis_stats.py comparar --datos datos.xlsx --y postest --grupo grupo
    python tesis_stats.py --help
"""
from __future__ import annotations

import argparse
import sys
import warnings

from ts_asociar import chi_cuadrado, coef_correlacion, correlacion, matriz_correlaciones
from ts_base import (ALFA, P, Resultado, cargar_datos, decision_txt, fnum, fp_valor, set_decimal,
                     tabla_formateada, test_normalidad)
from ts_comparar import (anova_clasica, anova_welch, comparar_grupos, comparar_pareadas, descriptivos, dunn,
                         frecuencias, games_howell, kruskal, mann_whitney, perfil_datos, t_independiente,
                         tukey_hsd, wilcoxon_pareado)
from ts_confiabilidad import confiabilidad_escala
from ts_informe import Informe
from ts_modelos import hosmer_lemeshow, regresion_lineal, regresion_logistica
from ts_muestra import muestra_poblacion, n_poblacion, n_potencia, potencia_muestra

__version__ = "1.0.0"
__all__ = [n for n in dir() if not n.startswith("_")]


def _parse_ref(items):
    out = {}
    for it in items or []:
        if "=" not in it:
            raise SystemExit("--ref debe tener la forma variable=categoría (ej.: sexo=Mujer)")
        k, v = it.split("=", 1)
        out[k.strip()] = v.strip()
    return out


def main(argv=None):
    p = argparse.ArgumentParser(description="Análisis estadístico para tesis (español, APA 7).")
    sub = p.add_subparsers(dest="cmd", required=True)

    def comun(sp, datos=True):
        if datos:
            sp.add_argument("--datos", required=True, help="Archivo .xlsx, .csv o .sav")
            sp.add_argument("--hoja", default=0, help="Hoja de Excel (nombre o número)")
        sp.add_argument("--salida", default="resultados_estadistica")
        sp.add_argument("--formatos", nargs="+", default=["md", "xlsx", "docx"], choices=["md", "xlsx", "docx"])
        sp.add_argument("--decimal", default=".", choices=[".", ","], help="Separador decimal de los textos")
        sp.add_argument("--titulo", default=None, help="Título del informe")

    s = sub.add_parser("perfil"); comun(s); s.add_argument("--vars", nargs="*")
    s = sub.add_parser("descriptivos"); comun(s); s.add_argument("--vars", nargs="+", required=True); s.add_argument("--por")
    s = sub.add_parser("frecuencias"); comun(s); s.add_argument("--var", required=True)
    s = sub.add_parser("comparar"); comun(s); s.add_argument("--y", required=True); s.add_argument("--grupo", required=True)
    s.add_argument("--ordinal", action="store_true"); s.add_argument("--orden", nargs="*")
    s = sub.add_parser("pareadas"); comun(s); s.add_argument("--pre", required=True); s.add_argument("--post", required=True)
    s.add_argument("--ordinal", action="store_true")
    s = sub.add_parser("correlacion"); comun(s); s.add_argument("--x"); s.add_argument("--y"); s.add_argument("--vars", nargs="*")
    s.add_argument("--ordinal", action="store_true"); s.add_argument("--metodo", default="auto", choices=["auto", "pearson", "spearman"])
    s.add_argument("--ajuste", default="ninguno", choices=["ninguno", "holm", "bonferroni"])
    s = sub.add_parser("confiabilidad"); comun(s); s.add_argument("--items", nargs="+", required=True)
    s.add_argument("--etiqueta", default=None); s.add_argument("--invertir", nargs="*", default=None)
    s = sub.add_parser("chi2"); comun(s); s.add_argument("--x", required=True); s.add_argument("--y", required=True)
    s = sub.add_parser("regresion"); comun(s); s.add_argument("--y", required=True); s.add_argument("--x", nargs="+", required=True)
    s.add_argument("--ref", nargs="*"); s.add_argument("--robusto", default="auto", choices=["auto", "si", "no"])
    s = sub.add_parser("logistica"); comun(s); s.add_argument("--y", required=True); s.add_argument("--x", nargs="+", required=True)
    s.add_argument("--evento"); s.add_argument("--ref", nargs="*")
    s = sub.add_parser("muestra"); comun(s, datos=False); s.add_argument("--N", type=int, default=None)
    s.add_argument("--confianza", type=float, default=0.95); s.add_argument("--error", type=float, default=0.05)
    s.add_argument("--p", type=float, default=0.5)
    s = sub.add_parser("potencia"); comun(s, datos=False)
    s.add_argument("--prueba", required=True, choices=["t_independiente", "t_pareada", "anova", "regresion", "correlacion", "chi2"])
    s.add_argument("--efecto", type=float); s.add_argument("--k", type=int, default=3); s.add_argument("--gl", type=int, default=1)
    s.add_argument("--predictores", type=int, default=3); s.add_argument("--potencia", type=float, default=0.80)
    s.add_argument("--alfa", type=float, default=ALFA)

    a = p.parse_args(argv)
    set_decimal(a.decimal)
    warnings.filterwarnings("ignore")
    try:
        df = None
        if getattr(a, "datos", None):
            hoja = int(a.hoja) if str(a.hoja).isdigit() else a.hoja
            df = cargar_datos(a.datos, hoja)
        sal = a.salida
        if a.cmd == "perfil":
            r = perfil_datos(df, a.vars, salida=sal)
        elif a.cmd == "descriptivos":
            r = descriptivos(df, a.vars, a.por, salida=sal)
        elif a.cmd == "frecuencias":
            r = frecuencias(df, a.var, salida=sal)
        elif a.cmd == "comparar":
            r = comparar_grupos(df, a.y, a.grupo, ordinal=a.ordinal, orden=a.orden, salida=sal)
        elif a.cmd == "pareadas":
            r = comparar_pareadas(df, a.pre, a.post, ordinal=a.ordinal, salida=sal)
        elif a.cmd == "correlacion":
            if a.vars and len(a.vars) >= 3:
                r = matriz_correlaciones(df, a.vars, metodo=a.metodo, ordinal=a.ordinal, ajuste=a.ajuste, salida=sal)
            else:
                xx, yy = (a.vars[0], a.vars[1]) if a.vars and len(a.vars) == 2 else (a.x, a.y)
                if not xx or not yy:
                    raise SystemExit("Indica --x y --y, o --vars con 2 o más variables.")
                r = correlacion(df, xx, yy, ordinal=a.ordinal, metodo=a.metodo, salida=sal)
        elif a.cmd == "confiabilidad":
            r = confiabilidad_escala(df, a.items, etiqueta_escala=a.etiqueta, invertir=a.invertir, salida=sal)
        elif a.cmd == "chi2":
            r = chi_cuadrado(df, a.x, a.y, salida=sal)
        elif a.cmd == "regresion":
            rob = {"auto": "auto", "si": True, "no": False}[a.robusto]
            r = regresion_lineal(df, a.y, a.x, robusto=rob, referencia=_parse_ref(a.ref), salida=sal)
        elif a.cmd == "logistica":
            r = regresion_logistica(df, a.y, a.x, evento=a.evento, referencia=_parse_ref(a.ref), salida=sal)
        elif a.cmd == "muestra":
            r = muestra_poblacion(a.N, a.confianza, a.error, a.p, salida=sal)
        elif a.cmd == "potencia":
            r = potencia_muestra(a.prueba, a.efecto, a.alfa, a.potencia, a.k, a.gl, a.predictores, salida=sal)
        inf = Informe(a.titulo or "Informe de análisis estadístico", salida=sal)
        inf.agregar(r)
        rutas = inf.guardar(a.formatos)
        print(r.a_markdown()[0])
        print("\nArchivos generados:")
        for k, v in rutas.items():
            print(f"  [{k}] {v}")
        for f in r.figuras:
            print(f"  [png] {f}")
    except ValueError as e:
        print(f"\nERROR: {e}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
