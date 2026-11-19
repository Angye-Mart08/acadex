# Lighthouse — Quick Tunnel (18 de noviembre de 2026)

URL evaluada: https://availability-str-regularly-lincoln.trycloudflare.com/

Lighthouse 13.6.0, Chrome en modo headless, categorías de rendimiento y accesibilidad. Las dos corridas son del mismo build y de la misma URL; no hubo cambio de código entre ellas. La segunda es una repetición para medir variación, no una medición posterior a una optimización.

| Corrida | Hora local (America/Bogota) | Rendimiento | Accesibilidad | FCP | LCP | TBT | CLS |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 — línea base | 20:20:49 | 84 | 100 | 2,2 s | 4,0 s | 0 ms | 0 |
| 2 — repetición | 20:21:10 | 89 | 100 | 1,9 s | 3,6 s | 0 ms | 0 |

Los informes JSON conservan la hora UTC original y los demás datos de auditoría. La URL pertenece a un Quick Tunnel temporal y deja de funcionar al cerrar `cloudflared`.
