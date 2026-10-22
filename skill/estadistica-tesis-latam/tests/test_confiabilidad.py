# -*- coding: utf-8 -*-
"""Pruebas de confiabilidad_escala (alfa de Cronbach) contra pingouin.cronbach_alpha."""
import os
import sys

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scripts"))
import tesis_stats as ts  # noqa: E402

pg = pytest.importorskip("pingouin")
RNG = np.random.default_rng(321)


def close(a, b, tol=1e-6):
    assert abs(a - b) <= tol * max(1, abs(b)), f"{a} != {b}"


def _escala(n=120, k=5, carga=0.7, ruido=0.6, seed=321):
    rng = np.random.default_rng(seed)
    rasgo = rng.normal(0, 1, n)
    df = pd.DataFrame({f"it{i}": rasgo * carga + rng.normal(0, ruido, n) for i in range(k)})
    return df


def test_alfa_y_ic_vs_pingouin():
    df = _escala()
    r = ts.confiabilidad_escala(df, [f"it{i}" for i in range(5)], etiqueta_escala="prueba")
    alfa_pg, ci_pg = pg.cronbach_alpha(data=df, ci=.95)
    close(r.datos["alfa"], alfa_pg, tol=1e-9)
    close(r.datos["ic95"][0], ci_pg[0], tol=1e-3)
    close(r.datos["ic95"][1], ci_pg[1], tol=1e-3)
    assert r.datos["k"] == 5 and r.datos["n"] == 120
    assert "α de Cronbach" in r.parrafo or "alfa de Cronbach" in r.parrafo


def test_item_total_manual():
    df = _escala(k=4)
    cols = [f"it{i}" for i in range(4)]
    r = ts.confiabilidad_escala(df, cols, etiqueta_escala="prueba")
    for c in cols:
        resto = df.drop(columns=[c]).sum(axis=1)
        esperado = float(np.corrcoef(df[c], resto)[0, 1])
        close(r.datos["correlaciones_item_total"][c], esperado, tol=1e-6)


def test_alfa_si_elimina_consistente():
    df = _escala(k=4)
    cols = [f"it{i}" for i in range(4)]
    r = ts.confiabilidad_escala(df, cols, etiqueta_escala="prueba")
    tabla = r.tablas["Estadísticos de ítem-total"]
    for c in cols:
        sub = ts.confiabilidad_escala(df, [x for x in cols if x != c], etiqueta_escala="sin_item")
        esperado = sub.datos["alfa"]
        fila = tabla.loc[tabla["Ítem"] == c, "Alfa si se elimina el ítem"].iloc[0]
        close(fila, esperado, tol=1e-6)


def test_correlacion_negativa_genera_aviso():
    df = _escala(k=4)
    df["it0"] = -df["it0"]  # ítem mal codificado (debería invertirse)
    r = ts.confiabilidad_escala(df, [f"it{i}" for i in range(4)], etiqueta_escala="prueba")
    assert any("correlación ítem-total negativa" in a for a in r.avisos)


def test_invertir_corrige_la_negativa():
    df = _escala(k=4)
    df["it0"] = -df["it0"]
    sin_invertir = ts.confiabilidad_escala(df, [f"it{i}" for i in range(4)], etiqueta_escala="prueba")
    con_invertir = ts.confiabilidad_escala(df, [f"it{i}" for i in range(4)], etiqueta_escala="prueba",
                                           invertir=["it0"])
    assert con_invertir.datos["alfa"] > sin_invertir.datos["alfa"]
    assert not any("correlación ítem-total negativa" in a for a in con_invertir.avisos)


def test_datos_faltantes_eliminacion_por_lista():
    df = _escala(k=4)
    n_original = len(df)
    df.loc[0:4, "it1"] = np.nan
    r = ts.confiabilidad_escala(df, [f"it{i}" for i in range(4)], etiqueta_escala="prueba")
    assert r.datos["n"] == n_original - 5
    assert any("eliminación por lista" in a for a in r.avisos)


def test_menos_de_dos_items_error():
    df = _escala(k=4)
    with pytest.raises(ValueError, match="al menos 2 ítems"):
        ts.confiabilidad_escala(df, ["it0"], etiqueta_escala="prueba")


def test_columna_inexistente_sugiere_parecida():
    df = _escala(k=4)
    with pytest.raises(ValueError, match="¿Quisiste decir"):
        ts.confiabilidad_escala(df, ["it0", "itt1"], etiqueta_escala="prueba")


def test_cli_confiabilidad(tmp_path):
    df = _escala(k=4)
    ruta = tmp_path / "datos.csv"
    df.to_csv(ruta, index=False)
    salida = tmp_path / "salida"
    ts.main(["confiabilidad", "--datos", str(ruta), "--items", "it0", "it1", "it2", "it3",
            "--salida", str(salida), "--formatos", "md"])
    assert (salida / "informe.md").exists()
    contenido = (salida / "informe.md").read_text(encoding="utf-8")
    assert "Alfa de Cronbach" in contenido
