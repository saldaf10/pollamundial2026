# Polla Mundial 2026 — Instrucciones

## Arrancar la app

```bash
cd pollamundial2026
npm run dev
# Abre http://localhost:3000
```

Para producción:
```bash
npm run build && npm start
```

## Contraseña admin
La contraseña está en `.env.local`:
```
ADMIN_PASSWORD=mundial2026
```
Cámbiala antes de distribuir.

## Flujo para el organizador

### 1. Generar códigos
- Ve a `http://localhost:3000/admin`
- Contraseña: `mundial2026`
- Pestaña **Códigos** → escribe cuántos necesitas → **Generar**
- Haz clic en ✏️ para ponerle el nombre a cada participante
- **Copiar todos** para pegarlos en WhatsApp/email

### 2. Antes de cada partido
- En la pestaña **Resultados**, busca el partido
- Haz clic en 🔓 para bloquearlo (cierra pronósticos)

### 3. Después de cada partido
- Ingresa el marcador real y pulsa **OK**

## Puntuación
| Pronóstico | Puntos |
|---|---|
| Marcador exacto | **2 pts** |
| Resultado correcto (G/E/P) | **1 pt** |
| Errado | 0 pts |

Aplica igual para fase de grupos y dieciseisavos.

## Archivos de datos
Los datos se guardan en `/data/`:
- `codes.json` — participantes y códigos
- `predictions.json` — pronósticos por código
- `results.json` — marcadores reales

**Haz backup de esta carpeta regularmente.**
