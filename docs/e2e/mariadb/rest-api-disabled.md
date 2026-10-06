# rest-api-disabled

Run 2026-10-06T21:11:23.098Z against http://127.0.0.1:3000.

| screenshot | user | URL | shows |
|---|---|---|---|
| ![](rest-api-disabled-admin-warning.png) | admin | `/projects/e2e-project` | REST API off: the admin sees the drawio warning that the REST API must be enabled |
| ![](rest-api-disabled-save-refused.png) | manager | `/projects/e2e-project/wiki/Drawio_png` | manager, REST off: saving shows the alert "Error saving diagram: Forbidden" (the diagram is already replaced in the page, nothing is stored); no warning banner for non-admins |
| ![](rest-api-disabled-admin-no-warning.png) | admin | `/projects/e2e-project` | REST API on again: no warning |
