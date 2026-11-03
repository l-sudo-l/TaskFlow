import { test } from "node:test";
import assert from "node:assert/strict";
import { crearRelojFijo } from "../src/reloj.js";

test("R20: a las 22:30 del 21/10 en Argentina ya es 22/10 en UTC, pero hoy sigue siendo 21/10", () => {
  const reloj = crearRelojFijo("2026-10-22T01:30:00Z");
  assert.equal(reloj.hoy(), "2026-10-21");
});

test("R20: a las 03:00 de Argentina ya cambió el día", () => {
  const reloj = crearRelojFijo("2026-10-22T06:00:00Z");
  assert.equal(reloj.hoy(), "2026-10-22");
});

test("R20: justo a medianoche de Argentina empieza el día nuevo", () => {
  const reloj = crearRelojFijo("2026-12-31T23:59:59-03:00");
  assert.equal(reloj.hoy(), "2026-12-31");
  reloj.fijar("2027-01-01T00:00:00-03:00");
  assert.equal(reloj.hoy(), "2027-01-01");
});
