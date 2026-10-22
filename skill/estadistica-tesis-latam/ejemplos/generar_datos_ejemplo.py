# -*- coding: utf-8 -*-
"""Genera una base SINTÉTICA (datos inventados) para probar la skill. No corresponde a ningún estudio real."""
import os

import numpy as np
import pandas as pd

rng = np.random.default_rng(2026)
n = 150
grupo = np.array(["Control"] * 75 + ["Experimental"] * 75)
sexo = rng.choice(["Mujer", "Hombre"], n, p=[0.58, 0.42])
facultad = rng.choice(["Educación", "Ingeniería", "Salud"], n, p=[0.4, 0.3, 0.3])
edad = np.clip(rng.normal(24, 4, n).round(), 18, 45)
horas = np.clip(rng.gamma(shape=4, scale=1.6, size=n), 0.5, 20).round(1)          # asimétrica a la derecha
pretest = np.clip(rng.normal(11.5, 2.6, n), 3, 20).round(1)
efecto = np.where(grupo == "Experimental", 2.3, 0.4)
postest = np.clip(pretest + efecto + 0.18 * (horas - horas.mean()) + rng.normal(0, 1.8, n), 0, 20).round(1)
ansiedad = np.clip(rng.normal(30, 7, n) - 0.9 * (postest - postest.mean()), 10, 50).round(0)
satisf = np.clip(np.round(3.2 + 0.25 * (grupo == "Experimental") + 0.04 * (postest - 12) + rng.normal(0, 0.9, n)), 1, 5)
logit = -1.2 + 0.32 * (postest - 12) + 0.05 * (horas - horas.mean())
aprobado = np.where(rng.random(n) < 1 / (1 + np.exp(-logit)), "Sí", "No")

# Escala Likert de 5 ítems (rasgo latente + ruido por ítem) para probar confiabilidad.
rasgo = rng.normal(0, 1, n)
items_satisf = {}
for i in range(1, 6):
    bruto = 3.2 + 0.6 * rasgo + rng.normal(0, 0.55, n)
    items_satisf[f"satisf_{i}"] = np.clip(np.round(bruto), 1, 5).astype(int)

df = pd.DataFrame({"id": np.arange(1, n + 1), "grupo": grupo, "sexo": sexo, "facultad": facultad, "edad": edad.astype(int),
                   "horas_estudio": horas, "pretest": pretest, "postest": postest, "ansiedad": ansiedad.astype(int),
                   "satisfaccion": satisf.astype(int), **items_satisf, "aprobado": aprobado})
for col in ("horas_estudio", "ansiedad"):                       # ~3% de datos faltantes
    df.loc[rng.choice(n, 5, replace=False), col] = np.nan

aqui = os.path.dirname(os.path.abspath(__file__))
df.to_csv(os.path.join(aqui, "datos_ejemplo.csv"), index=False, encoding="utf-8-sig")
df.to_excel(os.path.join(aqui, "datos_ejemplo.xlsx"), index=False)
print(df.head(), "\n", df.shape)
