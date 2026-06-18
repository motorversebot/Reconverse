# Repairverse — MC endpoint contract

Repairverse is a Motorverse module that runs inside Reconverse. The UI
(`src/pages/dealer/RepairResearchPage.tsx`) reads through `src/lib/repairverse.ts`,
which calls same-origin `/api/v1/reconverse/repairverse/*`. `api/proxy.ts`
forwards those to Mission Control (`MC_API_INTERNAL`). Data lives in the
**`repairverse` schema of motorverse_pg** (MC's Postgres).

Until these MC endpoints exist (or `MC_API_INTERNAL` is unset), the client
falls back to labeled seed data and the page shows a **SEED DATA** badge.

## Endpoints to implement in MC

### `GET /api/v1/reconverse/repairverse/vehicles/:id/research`
Returns the full research bundle for a vehicle. Response: `{ ok: true, data: ResearchBundle }`.

```jsonc
{
  "vehicle":   { "id","year","make","model","trim","engine","drivetrain","vin","ro_number","stock","mileage" },
  "procedures":[ { "id","title","system","summary","difficulty","fitment_level","labor_hours","source","source_ref",
                   "steps":[{"step_no","title","body"}],
                   "warnings":[{"severity","body"}],
                   "parts":[{"part_number","description","qty"}] } ],
  "labor":     [ { "operation","hours","note" } ],
  "specs":     [ { "kind","name","value" } ],            // kind = torque | fluid | general
  "dtcs":      [ { "code","description","system","causes","diagnostic_steps" } ],
  "tsbs":      [ { "tsb_number","title","summary","issued_date","fitment_level" } ],
  "recalls":   [ { "recall_id","status","title","summary" } ],
  "wiring":    [ { "circuit","drawing_ref","description","circuits":[{"name","wire","pin","color"}] } ],
  "components":[ { "component","location","notes" } ],
  "maintenance":[{ "service","interval_miles","interval_months","note" } ],
  "notes":     [ { "vehicle_pattern","related_term","dtc","body","author","created_at" } ]
}
```

Backing SQL (one query per array, all filtered by `vehicle_id`):
```sql
select id,title,system,summary,difficulty,fitment_level,labor_hours,
       (select name from repairverse.sources s where s.id=p.source_id) as source, source_ref
from repairverse.procedures p where vehicle_id = $1;
select step_no,title,body from repairverse.procedure_steps where procedure_id = $1 order by step_no;
select severity,body from repairverse.warnings where procedure_id = $1;
select part_number,description,qty from repairverse.parts where procedure_id = $1;
select operation,hours,note from repairverse.labor_ops where vehicle_id = $1;
select kind,name,value from repairverse.specs where vehicle_id = $1;
select code,description,system,causes,diagnostic_steps from repairverse.dtcs where vehicle_id = $1 or vehicle_id is null;
select tsb_number,title,summary,issued_date,fitment_level from repairverse.tsbs where vehicle_id = $1;
select recall_id,status,title,summary from repairverse.recalls where vehicle_id = $1;
select circuit,drawing_ref,description from repairverse.wiring_diagrams where vehicle_id = $1;  -- + wiring_circuits by diagram_id
select component,location,notes from repairverse.component_locations where vehicle_id = $1;
select service,interval_miles,interval_months,note from repairverse.maintenance_items where vehicle_id = $1;
select vehicle_pattern,related_term,dtc,body,author,created_at from repairverse.shop_notes where vehicle_id = $1;
```

### `POST /api/v1/reconverse/repairverse/shop-notes`
Body: `{ vehicle_id, vehicle_pattern, related_term, dtc?, body, author? }`. Response `{ ok: true }`.
```sql
insert into repairverse.shop_notes(vehicle_id,vehicle_pattern,related_term,dtc,body,author)
values ($1,$2,$3,$4,$5,$6);
```

### (optional) `GET /api/v1/reconverse/repairverse/procedures/:id`
Single procedure with steps/warnings/parts — same shape as one `procedures[]` element. Used if you want to lazy-load procedure detail instead of including it in the bundle.

## Schema
DDL + seed are in the Repairverse deliverables: `repairverse_schema.sql`, `repairverse_seed.sql`
(already applied to motorverse_pg). Seed rows carry `sources.kind='seed'`.

## Going live
1. Implement the two endpoints above in MC against `repairverse.*`.
2. Set `MC_API_INTERNAL` on the Reconverse Vercel deployment to MC's public URL.
3. The page drops the SEED badge and serves live rows automatically — no client change.

## Ingestion (ALLDATA / ProDemand)
Importers insert into the same tables with a real `sources` row (`kind='oem'` / `'aftermarket_db'`)
and `source_ref` = upstream document id. Keep `kind='seed'` rows separate. Confirm licensing/ToS
scope before building scrapers.
