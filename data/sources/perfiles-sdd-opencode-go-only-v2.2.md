**Perfiles SDD para Gentle-AI + OpenCode**

**Edición 100% OpenCode Go — v2.2 (verificada contra docs oficiales,
19/08/2026)**

Actualización tras el crecimiento del catálogo de OpenCode Go a 18+
modelos: los caballos de trabajo de la v1 (Kimi K2.7 Code, Qwen3.7 Max,
MiMo-Pro) SIGUEN disponibles, y encima se añade una capa nueva de
francotiradores frontier (Kimi K3, Grok 4.5, Qwen3.8 Max), GPT-5.6 Luna
con cuota Go, GLM-5.3 como flagship Zhipu, y volumen nuevo (Hy3, Muse
Spark). Diseño resultante: el chasis probado de la v1 + francotiradores
en los roles de un disparo. Misma estructura y orden del TUI.

*Fecha de revisión: 19/08/2026 · Edición Go-only v2.2, con caps
verificados contra opencode.ai/docs/go (actualizado ese mismo día).
Reemplaza a v1 (24/07) y a los borradores v2/v2.1.*

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>El cambio estructural: cuatro niveles de cap, verificados
contra los docs oficiales</strong></p>
<p>El catálogo es aditivo: nada de la v1 desapareció. Cuatro niveles
conviven: (1) FRANCOTIRADORES — Kimi K3 (110), Grok 4.5 (120), Qwen3.8
Max (160): solo roles de 1-2 llamadas por ciclo. (2)
SEMI-FRANCOTIRADORES — GLM-5.3 (220) y Qwen3.7 Max (340): fases de pocas
llamadas (design, verify, jueces), nunca loops largos. GLM-5.3 cuesta lo
mismo por token que 5.2 pero su multiplicador de uso mensual es $15 vs
$60: NO es drop-in. (3) CABALLOS DE TRABAJO — GLM-5.2 (880), DeepSeek V4
Pro (1,050), Kimi K2.7 Code (1,350), Luna (2,050), M3 (3,200), MiMo-Pro
(3,250), Qwen3.7 Plus (4,300), Hy3 (4,300 base): fases con loops. (4)
VOLUMEN — Flash (7,600), MiMo-V2.5 (30,100). Regla de laboratorio: Kimi
K3, K2.7 y K2.6 son Moonshot — donde uno implementa, otro no verifica ni
juzga esa corrida.</p></td>
</tr>
</tbody>
</table>

| **Perfil** | **Uso previsto** | **Calidad** | **Costo (cap Go)** |
|----|----|----|----|
| **HIGH** | Producción, clientes, cambios críticos, refactors, migraciones y features con riesgo técnico. | Muy alta (frontier en puntos clave) | Alto |
| **BALANCED** | Perfil diario recomendado: calidad alta, buen cap y francotiradores solo donde cambian el resultado. | Alta | Medio |
| **LEAN** | Prototipos, scripts, side projects, MVPs rápidos y cambios ligeros con costo mínimo. | Aceptable | Bajo |

**1. Fases SDD y agentes del perfil**

El orden replica el editor de perfiles de Gentle-AI (Assign Models to
SDD Phases & JD Agents): gentle-orchestrator primero, sdd-onboard al
final de las fases y los tres agentes jd-\* al cierre.

| **Fila del TUI** | **UI / Abstracción anterior** | **Función real** |
|----|----|----|
| gentle-orchestrator | Coordinador (no es fase) | Coordinador del perfil: entiende la intención, delega a los subagentes por fase y sostiene la sesión completa. |
| sdd-init | Inicialización | Detecta stack, scripts, convenciones, pruebas y estado mínimo del proyecto. |
| sdd-explore | Exploración | Investiga flujos, dependencias, archivos clave, riesgos y áreas impactadas. |
| sdd-propose | Propuesta / PRD operativo | Convierte la intención en alternativa recomendada, alcance, riesgos y criterios de decisión. |
| sdd-spec | Especificación / OpenSpec | Formaliza requisitos, contratos, criterios de aceptación y comportamiento esperado. |
| sdd-design | Diseño técnico | Define arquitectura, cambios por capas, estrategia de datos, APIs, UI y pruebas. |
| sdd-tasks | Plan de tareas | Divide el diseño en pasos ejecutables, ordenados y verificables. |
| sdd-apply | Implementación | Aplica cambios en código, archivos, configuraciones, tests y scripts. |
| sdd-verify | Review / Audit | Valida diff, pruebas, riesgos, regresiones, seguridad y cumplimiento de spec. |
| sdd-archive | Cierre / Commit-ready | Resume artefactos, deja bitácora, notas de commit y estado final. |
| sdd-onboard | Onboarding de proyecto | Absorbe contexto base, estructura, memoria y reglas antes de explorar en profundidad. |
| jd-judge-a | Judgment Day — Juez A | Primer juez de la revisión dual ciega: veredicto independiente, sin bash. |
| jd-judge-b | Judgment Day — Juez B | Segundo juez independiente; laboratorio distinto al Juez A y al implementador. |
| jd-fix-agent | Judgment Day — Fixer | Aplica las correcciones; los mismos jueces re-juzgan (no hay agente de re-juicio). |

**2. Base de selección de modelos y límites operativos (18-19/08/2026)**

Caps verificados contra opencode.ai/docs/go (Last updated: Aug 19,
2026). Los límites son en valor: \$12/5h, \$30/semana, \$60/mes; el
conteo de requests depende del modelo. El dashboard de uso solo grafica
modelos con consumo reciente — /models y los docs son la fuente de
verdad. Privacidad (tabla oficial): NINGÚN modelo del catálogo entrena
con tus datos; Grok 4.5 y Luna retienen logs 30 días; el ZDR de DeepSeek
se renueva mensualmente (el vigente vence 31/08/2026 — vale confirmar su
renovación si corres código de clientes por DeepSeek).

**2.1 Catálogo actual y rol asignado**

| **Modelo** | **ID oficial** | **Req/5h (docs)** | **Nivel** | **Rol en los perfiles v2.2** |
|----|----|----|----|----|
| Kimi K3 | opencode-go/kimi-k3 | 110 | Francotirador | El flagship Moonshot: Verify en HIGH. Nunca en loops; nunca sobre corridas que implementó Moonshot. |
| Grok 4.5 | opencode-go/grok-4.5 | 120 | Francotirador | Juez A en HIGH: xAI no toca ninguna otra fase — contaminación cero por construcción. Nota: retiene logs 30 días. |
| Qwen 3.8 Max | opencode-go/qwen3.8-max | 160 | Francotirador | Propose crítico en HIGH y escalación de design/verify. |
| GLM-5.3 | opencode-go/glm-5.3 | 220 | Semi-francotirador | Mismo precio/token que 5.2 pero multiplicador \$15: solo fases de pocas llamadas — Design crítico HIGH y Juez A BALANCED. |
| Qwen 3.7 Max | opencode-go/qwen3.7-max | 340 | Semi-francotirador | Bajó de ~950 a 340: conserva Verify BALANCED (1-2 llamadas/ciclo) y fallbacks de razonamiento, pero ya no es fallback de fases con loops. |
| GLM-5.2 | opencode-go/glm-5.2 | 880 | Caballo de trabajo | Sigue siendo el fuerte sostenible: Apply pesado + spec de contexto + Fixer HIGH. NO lo sustituyas por 5.3 en loops. |
| DeepSeek V4 Pro | opencode-go/deepseek-v4-pro | 1,050 | Caballo de trabajo | Juez B por defecto y spec lean. ZDR renovado mensualmente. |
| Kimi K2.7 Code | opencode-go/kimi-k2.7-code | 1,350 (subió de 1,150) | Caballo de trabajo | Sus roles v1 reforzados: spec, tasks, apply diario con tools y fixer. |
| GPT-5.6 Luna | opencode-go/gpt-5.6-luna | 2,050 | Caballo de trabajo | Cuota Go, sin suscripción ChatGPT: orquestador HIGH, propose balanced, fallback transversal. Retiene logs 30 días. |
| MiniMax M3 | opencode-go/minimax-m3 | 3,200 | Caballo de trabajo | El caballo de contexto (1M + multimodal): explore/design/onboard. |
| MiMo-V2.5-Pro | opencode-go/mimo-v2.5-pro | 3,250 | Caballo de trabajo | Verify lean y Juez B lean, como en v1. |
| Qwen 3.7 Plus | opencode-go/qwen3.7-plus | 4,300 | Caballo de trabajo | Orquestador BALANCED/LEAN, tasks, apply lean. |
| Hy3 | opencode-go/hy3 | 4,300 base (dashboard: 34,400 con promo 8x) | Caballo / Volumen ⚠ | Onboard/explore de volumen mientras dure la promo; su cap real de diseño es 4,300. |
| DeepSeek V4 Flash | opencode-go/deepseek-v4-flash | 7,600 | Volumen | Init y tasks mecánicas. |
| MiMo-V2.5 | opencode-go/mimo-v2.5 | 30,100 | Volumen | Archive, explore barato, onboarding de volumen. |
| Muse Spark 1.2 Contributor | opencode-go/muse-spark-1.2-contributor | 45,300 (NO listado en docs) | Experimental ⚠⚠ | Aparece en /models por rollout por país, pero no en la documentación oficial de Go. Fuera de los perfiles; ver advertencia abajo. |
| Legacy (K2.6 1,150 · M2.7 3,400 · GLM-5.1 880 · Qwen3.6 Plus 3,300) | (varios) | — | Legacy | Sin rol: sus sucesores cuestan igual o menos por request con mejor calidad. |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>⚠⚠ Muse Spark 1.2 Contributor: dos condiciones antes de
usarlo</strong></p>
<p>1) DATOS: el tier Contributor sirve los mismos pesos que Muse Spark
1.2 a cambio de que Meta use tus prompts y outputs para entrenar sus
modelos. PROHIBIDO para código de clientes, material bajo NDA o
cualquier repo de agencia — solo proyectos personales, públicos o de
licencia permisiva. 2) HARNESS: el modelo fue co-entrenado con el agente
Muse Code de Meta y hay reportes de que rinde mal justo en OpenCode (se
atasca en herramientas de búsqueda, ineficiente en tokens fuera de su
harness). Veredicto: cap enorme pero apuesta doble; pruébalo en un side
project personal en fases de archive/onboard antes de darle cualquier
fila de un perfil.</p></td>
</tr>
</tbody>
</table>

**2.2 Jerarquía práctica por dimensión (v2.1)**

| **Dimensión** | **Ranking recomendado** | **Razón** |
|----|----|----|
| Exploración / onboarding | MiniMax M3 \> Hy3 (promo) \> MiMo-V2.5 \> GLM-5.2 | M3 gana en calidad de contexto; Hy3/MiMo absorben el volumen que M3 ya no paga con 3,200. |
| Criterio de un disparo | Qwen3.8 Max \> Kimi K3 ≈ Grok 4.5 | El nuevo techo, solo para llamadas únicas. |
| Criterio sostenible | GLM-5.2 \> Kimi K2.7 Code \> Luna \> DeepSeek V4 Pro | El techo que aguanta un día completo de loops. GLM-5.3 y Qwen3.7 Max ya no viven aquí: son semi-francotiradores. |
| Spec técnica | Kimi K2.7 Code \> GLM-5.3 \> Luna \> Qwen3.7 Max | K2.7 recupera su corona v1: specs implementables con control de tools. |
| Design crítico | GLM-5.3 (220, pocas llamadas) \> GLM-5.2 \> Qwen3.8 Max (escalación) \> M3 | Design es fase de pocas llamadas: el semi-francotirador 5.3 la paga; si el design se vuelve iterativo/largo, baja a 5.2. |
| Tasks | Kimi K2.7 Code \> Qwen3.7 Plus \> Flash | Igual que v1: K2.7 convierte spec+design en tareas accionables. |
| Apply pesado | GLM-5.2 \> Kimi K2.7 Code \> M3 | Loops largos exigen cap: 5.2 (880), jamás 5.3 (220) ni Qwen3.7 Max (340). |
| Apply diario / tools | Kimi K2.7 Code \> M3 \> Qwen3.7 Plus | K2.7 de vuelta como default de implementación con herramientas. |
| Verify / Audit | Kimi K3 (1 disparo, si Moonshot no implementó) \> Qwen3.7 Max (340, alcanza: 1-2 llamadas/ciclo) \> GLM-5.2/5.3 \> Luna \> MiMo-Pro | Verificador ≠ implementador POR LABORATORIO. |
| Judgment Day (jueces) | Grok 4.5 / GLM-5.3 / Qwen3.8 Max como Juez A + DeepSeek V4 Pro / MiMo-Pro como Juez B | Jueces sin bash = lectura pura, el slot natural de francotiradores y semi-francotiradores — respetando la regla de laboratorio. |
| Archive / Cierre | MiMo-V2.5 \> Flash \> Hy3 | Cierre mecánico al costo mínimo. |

**3. Perfil HIGH (Go-only v2.2): alto rendimiento / producción**

**sdd-orchestrator-high · Producción, clientes y cambios de alto riesgo.
Calidad: muy alta · Costo: alto · Velocidad: media · Riesgo permitido:
bajo.**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>Razón del perfil HIGH v2.2</strong></p>
<p>Chasis v1 + capa frontier: GLM-5.3 (semi-francotirador, 220) diseña —
design es fase de pocas llamadas — mientras GLM-5.2 (880) implementa los
loops largos y hace de fixer; Kimi K2.7 recupera spec/tasks; y los
francotiradores toman los roles de un disparo — Qwen3.8 Max propone,
Kimi K3 verifica (implementó Zhipu, no Moonshot), Grok 4.5 juzga desde
un laboratorio que no toca ninguna fase. Luna coordina. Seis
laboratorios por ciclo.</p></td>
</tr>
</tbody>
</table>

**3.1 Configuración primaria por fase**

| **Fila del TUI** | **Rol operativo** | **Modelo primario** | **Esfuerzo** | **Razón** |
|----|----|----|----|----|
| gentle-orchestrator | Coordinador | opencode-go/gpt-5.6-luna | default | Routing fiable a 2,050 req/5h sin gastar a K2.7 (que ahora carga spec/tasks/fixes). Si prefieres el routing agentic de Kimi como en v1, K2.7 es el fallback 1. |
| sdd-init | Arranque rápido | opencode-go/deepseek-v4-flash | default | Detección de estructura barata; 7,600 sobra para init. |
| sdd-explore | Exploración profunda | opencode-go/minimax-m3 | default | 1M context + multimodal sigue sin rival; 3,200 alcanza porque ya no orquesta. |
| sdd-propose | Decisión estratégica | opencode-go/qwen3.8-max | default | Un disparo por ciclo del mejor razonador del catálogo; Qwen3.7 Max (su rol v1) queda de fallback directo. |
| sdd-spec | Spec implementable | opencode-go/kimi-k2.7-code | default | Restaurado de la v1: sigue en catálogo y sigue siendo el rey de specs orientadas a implementación con tools. |
| sdd-design | Arquitectura crítica | opencode-go/glm-5.3 | high | Design es fase de pocas llamadas: el semi-francotirador 5.3 (220 req) la paga y aporta el flagship más nuevo justo donde el criterio pesa. Si el design se vuelve iterativo, cae a 5.2 por fallback. |
| sdd-tasks | Plan ejecutable | opencode-go/kimi-k2.7-code | default | Restaurado de la v1: convierte spec y design en tareas accionables con control de herramientas. |
| sdd-apply | Implementación pesada | opencode-go/glm-5.2 | high si aparece | Los loops largos exigen cap: 5.2 (880 req) es el GLM de implementación. Mismo precio por token que 5.3, cuatro veces más presupuesto. |
| sdd-verify | Auditoría frontier | opencode-go/kimi-k3 | default | El mejor auditor del catálogo en 1-2 llamadas por ciclo. Válido porque implementó GLM (Zhipu ≠ Moonshot); si Apply cae a K2.7 por fallback, Verify conmuta a Qwen3.7 Max. |
| sdd-archive | Cierre barato | opencode-go/mimo-v2.5 | default | Cierre mecánico en el volumen más barato. |
| sdd-onboard | Contexto base | opencode-go/minimax-m3 | default | El mejor punto de entrada para repo amplio y contexto visual; Hy3 respalda el volumen. |
| jd-judge-a | JD — Juez A | opencode-go/grok-4.5 | default | xAI no participa en ninguna fase de ningún perfil: contaminación cero por construcción, en el slot de lectura pura donde 120 req/5h sobran. |
| jd-judge-b | JD — Juez B | opencode-go/deepseek-v4-pro | default | Laboratorio independiente estable para el segundo veredicto. |
| jd-fix-agent | JD — Fixer | opencode-go/kimi-k2.7-code | default | Restaurado de la v1: correcciones = implementación con tools activas, la zona de K2.7. |

**3.2 Fallbacks del perfil HIGH**

Reglas transversales: (a) verificador/jueces nunca del LABORATORIO que
implementó esa corrida — Kimi K3 y K2.7 cuentan como uno solo
(Moonshot); (b) francotiradores jamás como fallback de fases con loops.

| **Fila** | **Fallback 1** | **Fallback 2** | **Fallback 3** | **Regla de uso** |
|----|----|----|----|----|
| gentle-orchestrator | opencode-go/kimi-k2.7-code | opencode-go/minimax-m3 | opencode-go/qwen3.7-plus | K2.7 si prefieres routing agentic (config v1); M3 para sesiones de contexto enorme. |
| sdd-init | opencode-go/qwen3.7-plus | opencode-go/mimo-v2.5 | opencode-go/hy3 | MiMo para inspección trivial. |
| sdd-explore | opencode-go/hy3 | opencode-go/glm-5.2 | opencode-go/mimo-v2.5 | Hy3 para volumen mientras dure la promo; GLM-5.2 para dependencias profundas. |
| sdd-propose | opencode-go/qwen3.7-max | opencode-go/glm-5.2 | opencode-go/gpt-5.6-luna | Qwen3.7 Max (ahora 340: le alcanza para proposes) es el titular v1 del rol; GLM-5.2 si la propuesta depende de leer repo. |
| sdd-spec | opencode-go/glm-5.2 | opencode-go/gpt-5.6-luna | opencode-go/qwen3.7-max | GLM-5.2 si la spec depende de muchos archivos (contexto = loops de lectura). |
| sdd-design | opencode-go/glm-5.2 | opencode-go/qwen3.8-max | opencode-go/minimax-m3 | 5.2 si el design se vuelve iterativo o 5.3 se agota; Qwen3.8 Max como escalación irreversible; M3 si hay diagramas/UI. |
| sdd-tasks | opencode-go/qwen3.7-plus | opencode-go/minimax-m3 | opencode-go/deepseek-v4-pro | Qwen Plus suficiente para desglose. |
| sdd-apply | opencode-go/kimi-k2.7-code | opencode-go/qwen3.7-max | opencode-go/minimax-m3 | K2.7 si hay tools/MCP — y entonces Verify conmuta a Qwen3.7 Max (regla de laboratorio). |
| sdd-verify | opencode-go/qwen3.7-max | opencode-go/gpt-5.6-luna | opencode-go/deepseek-v4-pro | Qwen3.7 Max es el verify sostenible (rol v1). Nunca GLM (implementó) ni Moonshot si Kimi aplicó. |
| sdd-archive | opencode-go/deepseek-v4-flash | opencode-go/hy3 | opencode-go/qwen3.7-plus | Flash/Hy3 para cierre; Qwen Plus para changelog cuidado. |
| sdd-onboard | opencode-go/hy3 | opencode-go/glm-5.2 | opencode-go/mimo-v2.5 | Hy3 para volumen; GLM-5.2 si el repo es enorme. |
| jd-judge-a | opencode-go/kimi-k3 | opencode-go/qwen3.8-max | opencode-go/qwen3.7-max | Otro francotirador si Grok se agotó — K3 solo si Moonshot no implementó esa corrida. |
| jd-judge-b | opencode-go/mimo-v2.5-pro | opencode-go/gpt-5.6-luna | opencode-go/minimax-m3 | Sustitutos de laboratorio distinto al Juez A. |
| jd-fix-agent | opencode-go/glm-5.2 | opencode-go/qwen3.7-plus | opencode-go/minimax-m3 | GLM-5.2 para fixes pesados (los fixes son loops: nunca 5.3). |

**4. Perfil BALANCED (Go-only v2.2): recomendado para uso diario**

**sdd-orchestrator-balanced · Default diario: calidad alta con consumo
controlado. Calidad: alta · Costo: medio · Velocidad: alta · Riesgo
permitido: medio.**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>Razón del perfil BALANCED v2.2</strong></p>
<p>Es el chasis v1 casi intacto: Kimi K2.7 implementa (ahora con más
cap: 1,350), Qwen3.7 Max verifica (340 req alcanzan de sobra para 1-2
llamadas por ciclo), GLM-5.3 juzga con contexto fresco (juez = pocas
llamadas, el slot exacto de un semi-francotirador de 220). Los ajustes
v2.1: Qwen Plus toma la orquestación (el recorte de M3 a 3,200 ya no
paga coordinar + explorar + diseñar), Luna sube la calidad del propose
diario, y Hy3 absorbe el onboarding de volumen mientras dure su promo.
Nota de laboratorio: con Moonshot implementando, Kimi K3 NO participa en
este perfil salvo que Apply caiga a otro laboratorio.</p></td>
</tr>
</tbody>
</table>

**4.1 Configuración primaria por fase**

| **Fila del TUI** | **Rol operativo** | **Modelo primario** | **Esfuerzo** | **Razón** |
|----|----|----|----|----|
| gentle-orchestrator | Coordinador | opencode-go/qwen3.7-plus | default | El cap que no cambió (4,300) coordina, liberando a M3 para las fases de contexto. |
| sdd-init | Arranque eficiente | opencode-go/deepseek-v4-flash | default | Detección de estructura sin consumir caballos de trabajo. |
| sdd-explore | Exploración | opencode-go/minimax-m3 | default | El mejor equilibrio para navegar repo, UI y dependencias. |
| sdd-propose | Propuesta | opencode-go/gpt-5.6-luna | default | Mejora v2.1 sobre el Qwen Plus de la v1: criterio medio sostenible para el propose frecuente. |
| sdd-spec | Spec técnica | opencode-go/kimi-k2.7-code | default | Restaurado de la v1: la spec cerca del código real. |
| sdd-design | Diseño con repo | opencode-go/minimax-m3 | default | Balancea arquitectura con contexto y visuales; GLM-5.3 por fallback en refactor/migración. |
| sdd-tasks | Tareas | opencode-go/qwen3.7-plus | default | Barato y consistente. |
| sdd-apply | Implementación diaria | opencode-go/kimi-k2.7-code | default | Restaurado de la v1: el default de Apply por rendimiento agentic con tools; GLM para escalamiento pesado. |
| sdd-verify | Control fuerte | opencode-go/qwen3.7-max | default | Restaurado de la v1: verificador fuerte de laboratorio distinto a Moonshot. Su nuevo cap (340) alcanza: verify son 1-2 llamadas por ciclo, no loops. |
| sdd-archive | Cierre | opencode-go/mimo-v2.5 | default | Volumen barato para resumen y bitácora. |
| sdd-onboard | Contexto base | opencode-go/hy3 | default | El volumen promocional absorbe la lectura de arranque; M3 respalda si la calidad no alcanza. |
| jd-judge-a | JD — Juez A | opencode-go/glm-5.3 | default | Restaurado de la v1 y mejorado a 5.3: no tocó ninguna fase primaria y su cap de semi-francotirador (220) sobra para 1-2 veredictos por ciclo. |
| jd-judge-b | JD — Juez B | opencode-go/deepseek-v4-pro | default | Cuarto laboratorio sobre el diff. |
| jd-fix-agent | JD — Fixer | opencode-go/kimi-k2.7-code | default | Restaurado de la v1: ya conoce el cambio; fixes rápidos y coherentes. |

**4.2 Fallbacks del perfil BALANCED**

| **Fila** | **Fallback 1** | **Fallback 2** | **Fallback 3** | **Regla de uso** |
|----|----|----|----|----|
| gentle-orchestrator | opencode-go/gpt-5.6-luna | opencode-go/minimax-m3 | opencode-go/deepseek-v4-pro | Luna si la coordinación exige más criterio. |
| sdd-init | opencode-go/mimo-v2.5 | opencode-go/qwen3.7-plus | opencode-go/hy3 | MiMo para inspección trivial. |
| sdd-explore | opencode-go/hy3 | opencode-go/mimo-v2.5 | opencode-go/glm-5.2 | Hy3/MiMo para volumen; GLM-5.2 si hay relación multiarchivo muy larga. |
| sdd-propose | opencode-go/qwen3.7-max | opencode-go/qwen3.7-plus | opencode-go/qwen3.8-max | Qwen3.7 Max si Luna se limita; 3.8 Max solo como escalación crítica. |
| sdd-spec | opencode-go/minimax-m3 | opencode-go/qwen3.7-max | opencode-go/glm-5.2 | M3 si la spec depende de repo/visual; GLM-5.2 para contexto extremo. |
| sdd-design | opencode-go/glm-5.2 | opencode-go/qwen3.7-max | opencode-go/qwen3.8-max | GLM-5.2 para refactor/migración (el antiguo escalamiento); 3.8 Max en decisión irreversible. Si GLM-5.2 diseña Y aplica, el Juez A (5.3) sigue válido: mismo lab que implementador viola la regla — conmuta a Qwen3.8 Max. |
| sdd-tasks | opencode-go/kimi-k2.7-code | opencode-go/minimax-m3 | opencode-go/deepseek-v4-flash | K2.7 si las tasks deben incluir herramientas. |
| sdd-apply | opencode-go/glm-5.2 | opencode-go/minimax-m3 | opencode-go/qwen3.7-plus | GLM-5.2 para apply pesado — y entonces el Juez A conmuta a Kimi K3 o Qwen3.8 Max (Zhipu no se juzga a sí mismo) y Verify puede usar K3. |
| sdd-verify | opencode-go/kimi-k3 | opencode-go/gpt-5.6-luna | opencode-go/deepseek-v4-pro | K3 SOLO si Moonshot no implementó esa corrida (p. ej. Apply cayó a GLM/M3). |
| sdd-archive | opencode-go/deepseek-v4-flash | opencode-go/hy3 | opencode-go/qwen3.7-plus | Flash/Hy3 para cierre barato. |
| sdd-onboard | opencode-go/minimax-m3 | opencode-go/mimo-v2.5 | opencode-go/glm-5.2 | M3 si la calidad de Hy3 no alcanza o la promo termina. |
| jd-judge-a | opencode-go/qwen3.8-max | opencode-go/kimi-k3 | opencode-go/qwen3.7-max | Francotiradores si GLM implementó o se agotó — K3 solo con Moonshot fuera del ciclo; si cae a 3.7 Max, Verify no pudo ser 3.7 Max. |
| jd-judge-b | opencode-go/mimo-v2.5-pro | opencode-go/gpt-5.6-luna | opencode-go/minimax-m3 | Sustitutos de laboratorio distinto al Juez A. |
| jd-fix-agent | opencode-go/qwen3.7-plus | opencode-go/minimax-m3 | opencode-go/glm-5.2 | Qwen Plus para fixes ligeros; GLM-5.2 para pesados (solo si Zhipu no es juez esa corrida). |

**5. Perfil LEAN (Go-only v2.2): eficiencia de recursos**

**sdd-orchestrator-lean · Proyectos ligeros, MVPs, scripts y prototipos.
Calidad: aceptable · Costo: bajo · Velocidad: muy alta · Riesgo
permitido: alto.**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>Razón del perfil LEAN v2.2</strong></p>
<p>El chasis v1 con dos ajustes por caps: las tasks bajan de DeepSeek
Pro (recortado a 1,050) a Flash, y el onboarding sube a Hy3 mientras
dure la promo. MiMo-V2.5-Pro recupera su Verify (sigue en catálogo; la
v2 lo daba por muerto). Cero francotiradores, cero GLM y cero Kimi en el
camino primario. No usar Lean para autenticación, pagos, datos
sensibles, migraciones o producción crítica sin escalar.</p></td>
</tr>
</tbody>
</table>

**5.1 Configuración primaria por fase**

| **Fila del TUI** | **Rol operativo** | **Modelo primario** | **Esfuerzo** | **Razón** |
|----|----|----|----|----|
| gentle-orchestrator | Coordinador | opencode-go/qwen3.7-plus | default | Coordinación barata y consistente. |
| sdd-init | Arranque mínimo | opencode-go/deepseek-v4-flash | default | Sigue sobrando para estructuras ligeras pese al recorte. |
| sdd-explore | Exploración barata | opencode-go/mimo-v2.5 | default | Volumen casi ilimitado. |
| sdd-propose | Propuesta simple | opencode-go/qwen3.7-plus | default | Coherencia de alcance con buen cap. |
| sdd-spec | Spec ligera | opencode-go/deepseek-v4-pro | default | Suficiente para criterios de aceptación; su cap recortado aguanta el volumen bajo de lean. |
| sdd-design | Punto fuerte único | opencode-go/minimax-m3 | default | El diseño merece un modelo mejor incluso en lean. |
| sdd-tasks | Tareas baratas | opencode-go/deepseek-v4-flash | default | Ajuste v2.1: con DeepSeek Pro a 1,050, las tasks mecánicas bajan a Flash. |
| sdd-apply | Implementación aceptable | opencode-go/qwen3.7-plus | default | Ejecuta el task list en bucle de forma veloz; M3 si sube la complejidad. |
| sdd-verify | Revisión ligera | opencode-go/mimo-v2.5-pro | default | Restaurado de la v1: sigue en catálogo y es exactamente su rol — review lean con mejor calidad que MiMo base, laboratorio distinto a Qwen Plus. |
| sdd-archive | Cierre mínimo | opencode-go/mimo-v2.5 | default | Resumen y notas al costo mínimo. |
| sdd-onboard | Contexto ligero | opencode-go/hy3 | default | El volumen promocional absorbe el onboarding simple; MiMo respalda cuando la promo muera. |
| jd-judge-a | JD — Juez A | opencode-go/deepseek-v4-pro | default | Razonamiento decente, lab distinto al implementador. Para cambios triviales basta este veredicto único. |
| jd-judge-b | JD — Juez B | opencode-go/mimo-v2.5-pro | default | Restaurado de la v1; desactivable en cambios de un solo archivo. |
| jd-fix-agent | JD — Fixer | opencode-go/qwen3.7-plus | default | Coherente con el Apply del perfil. |

**5.2 Fallbacks del perfil LEAN**

| **Fila** | **Fallback 1** | **Fallback 2** | **Fallback 3** | **Regla de uso** |
|----|----|----|----|----|
| gentle-orchestrator | opencode-go/minimax-m3 | opencode-go/mimo-v2.5 | opencode-go/deepseek-v4-pro | M3 si la sesión crece en contexto. |
| sdd-init | opencode-go/mimo-v2.5 | opencode-go/hy3 | opencode-go/qwen3.7-plus | Subir solo si el arranque detecta estructura confusa. |
| sdd-explore | opencode-go/hy3 | opencode-go/deepseek-v4-flash | opencode-go/deepseek-v4-pro | Mantener barato; Pro si hay múltiples flujos. |
| sdd-propose | opencode-go/deepseek-v4-pro | opencode-go/gpt-5.6-luna | opencode-go/minimax-m3 | Luna para criterio de producto; M3 si hay repo/visual amplio. |
| sdd-spec | opencode-go/qwen3.7-plus | opencode-go/kimi-k2.7-code | opencode-go/minimax-m3 | Subir a K2.7 cuando la spec debe ser muy implementable (igual que v1). |
| sdd-design | opencode-go/deepseek-v4-pro | opencode-go/qwen3.7-plus | opencode-go/gpt-5.6-luna | Bajar si M3 no está; Luna para decisión final puntual. |
| sdd-tasks | opencode-go/mimo-v2.5 | opencode-go/deepseek-v4-pro | opencode-go/qwen3.7-plus | Tasks simples en volumen puro; Pro si requieren más criterio. |
| sdd-apply | opencode-go/minimax-m3 | opencode-go/kimi-k2.7-code | opencode-go/deepseek-v4-pro | M3/K2.7 si aumenta complejidad — recuerda: 2+ archivos = subir de perfil. |
| sdd-verify | opencode-go/gpt-5.6-luna | opencode-go/deepseek-v4-pro | opencode-go/qwen3.7-max | Luna si MiMo-Pro se agota; Qwen3.7 Max como escalación si el cambio creció. |
| sdd-archive | opencode-go/deepseek-v4-flash | opencode-go/hy3 | opencode-go/muse-spark-1.2-contributor | Muse Spark SOLO proyectos personales/públicos (sección 2) y solo cierre textual. |
| sdd-onboard | opencode-go/mimo-v2.5 | opencode-go/deepseek-v4-flash | opencode-go/muse-spark-1.2-contributor | MiMo cuando la promo de Hy3 muera; Muse Spark bajo la misma restricción de datos. |
| jd-judge-a | opencode-go/gpt-5.6-luna | opencode-go/qwen3.7-max | opencode-go/minimax-m3 | Si cae a Luna, el Juez B conmuta a DeepSeek Pro. |
| jd-judge-b | opencode-go/minimax-m3 | opencode-go/hy3 | opencode-go/mimo-v2.5 | Laboratorio distinto al Juez A; o desactivar en cambios triviales. |
| jd-fix-agent | opencode-go/deepseek-v4-pro | opencode-go/minimax-m3 | opencode-go/mimo-v2.5 | M3 si el fix se complica; MiMo para correcciones mecánicas. |

**6. Judgment Day v2.2: francotiradores y la regla de laboratorio**

Las asignaciones jd-\* están integradas en cada perfil. Esta sección
explica el criterio y la vista comparada.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>Las dos reglas que gobiernan los jueces</strong></p>
<p>1) SLOT: los subagentes JD corren sin bash — lectura pura de 1-2
llamadas por ciclo, el único lugar donde una cuota de 110-160 req/5h
rinde como frontier sin agotarse. 2) LABORATORIO: la independencia se
mide por lab, no por modelo — Kimi K3 y K2.7 Code son ambos Moonshot,
así que en BALANCED (donde K2.7 implementa) K3 queda fuera del ciclo
salvo que Apply caiga a otro laboratorio. Grok 4.5 es el único modelo
estructuralmente incontaminable: xAI no aparece en ninguna fase de
ningún perfil.</p></td>
</tr>
</tbody>
</table>

**6.1 Vista comparada entre perfiles**

| **Fila del TUI** | **HIGH** | **BALANCED** | **LEAN** |
|----|----|----|----|
| jd-judge-a | opencode-go/grok-4.5 | opencode-go/glm-5.3 | opencode-go/deepseek-v4-pro |
| jd-judge-b | opencode-go/deepseek-v4-pro | opencode-go/deepseek-v4-pro | opencode-go/mimo-v2.5-pro |
| jd-fix-agent | opencode-go/kimi-k2.7-code | opencode-go/kimi-k2.7-code | opencode-go/qwen3.7-plus |

*El re-juicio lo ejecutan los mismos jueces sobre el candidato
corregido; no tiene fila propia en el TUI.*

**6.2 Razonamiento de la asignación**

| **Decisión** | **Razón** |
|----|----|
| Grok 4.5 como Juez A en HIGH | El aislamiento estructural (xAI fuera de todas las fases) vale más que cualquier benchmark en el perfil de mayor riesgo. |
| GLM-5.3 como Juez A en BALANCED (no K3) | K3 sería tentador, pero Moonshot implementa en este perfil: mismo laboratorio viola la revisión ciega. GLM-5.3 llega fresco (cero fases primarias) y sus 220 req de semi-francotirador sobran para veredictos — el slot perfecto para el modelo que NO puede estar en loops. |
| Kimi K3 = Verify HIGH, no juez | Su disparo rinde más auditando el trabajo de GLM (labs distintos ✓) que duplicando el veredicto de Grok. |
| DeepSeek V4 Pro como Juez B por defecto | Laboratorio independiente estable, cap suficiente (1,050) para baja frecuencia. |
| Fixer = K2.7 (HIGH/BALANCED) / Qwen Plus (LEAN) | Correcciones = implementación con tools: la zona de K2.7, restaurada de la v1. |
| Presupuesto de francotiradores y semis | Francotiradores: 110-160 req ≈ 50-80 disparos/5h. Semis: GLM-5.3 220, Qwen3.7 Max 340. Orden de degradación si se agotan: francotirador → semi del mismo rol → GLM-5.2/Luna. Nunca degradar el Verify de HIGH antes que los jueces. |

**7. Guía directa de implementación en Gentle-AI / OpenCode**

| **Paso** | **Acción** | **Detalle implementable** |
|----|----|----|
| 1 | Verificar catálogo | /connect (OpenCode Go) y /models. Los IDs y caps de este documento están verificados contra opencode.ai/docs/go (19/08/2026); la única excepción es Muse Spark, que aparece en /models pero no en los docs (rollout por país). El endpoint https://opencode.ai/zen/go/v1/models devuelve la lista con metadata si quieres automatizar la verificación. |
| 2 | Actualizar perfiles | En gentle-ai → OpenCode SDD Profiles, edita high-go / balanced-go / lean-go. Los cambios vs v1 son pocos y quirúrgicos (ver 7.2): no hace falta reconstruir desde cero. |
| 3 | Configurar primarios | Asigna fila por fila en Assign Models to SDD Phases & JD Agents — las tablas replican el orden del TUI. Evita 'Set all SDD phases'. |
| 4 | Esfuerzo | GLM-5.3 acepta high en Design/Apply del perfil HIGH. Francotiradores en default: forzar esfuerzo extra multiplica el consumo de una cuota mínima. |
| 5 | Configurar fallbacks | Mínimo dos respaldos por fila. Invariantes: (a) verificador/jueces nunca del LABORATORIO que implementó (Moonshot cuenta como uno: K3+K2.7+K2.6); (b) francotiradores jamás en fases con loops. |
| 6 | Activar y validar | Guarda, sincroniza, Tab al orchestrator, tarea pequeña con /sdd-new. Verifica delegación, fallbacks ≠ 0/10 y que los jueces respondan. |

**7.1 Reglas de escalamiento y presupuesto**

| **Regla** | **Criterio** |
|----|----|
| Subir de Lean a Balanced | 2+ archivos no triviales, backend+frontend, pruebas fallando o ambigüedad funcional. |
| Subir de Balanced a High | Producción, cliente, seguridad, auth, pagos, migración, base de datos, permisos, refactor grande o riesgo de regresión. |
| Regla del francotirador | K3, Grok 4.5 y Qwen3.8 Max solo en roles de 1-2 llamadas: propose crítico, verify HIGH, jueces, decisión irreversible. Si aparecen en apply/tasks/orquestación, es error de configuración. |
| Regla de laboratorio | Moonshot (K3/K2.7/K2.6) y Zhipu (GLM-5.3/5.2/5.1) cuentan cada uno como UN laboratorio: donde una versión implementa, otra versión del mismo lab no verifica ni juzga esa corrida. |
| GLM-5.3 vs 5.2: por rol, no por versión | Mismo precio por token, multiplicadores distintos (\$15 vs \$60 → 220 vs 880 req/5h). 5.3 en fases de pocas llamadas (design, juez); 5.2 en todo lo que itere (apply, spec de contexto, fixes). Sustituir 5.2 por 5.3 en loops agota la cuota en una sesión. |
| Presupuesto Hy3 | Los docs confirman: cap base 4,300; el 34,400 del dashboard es la promo 8x. Volumen agresivo mientras dure, con MiMo/M3 de fallback para que el perfil sobreviva su muerte sin edición. |
| Muse Spark Contributor | Solo proyectos personales/públicos (Meta entrena con tus datos) y solo fases textuales, hasta validar su comportamiento en el harness de OpenCode. Nunca código de clientes. |
| No dejar fallbacks vacíos | Con cuotas de 110-160 en roles clave, 0/10 fallbacks es directamente irresponsable. |

**7.2 Diff quirúrgico contra la edición Go-only v1 (24/07/2026)**

La v2.1 conserva el chasis v1. Estos son TODOS los cambios — el resto de
filas queda idéntico:

| **Fila** | **v1 decía** | **v2.1 dice** | **Por qué** |
|----|----|----|----|
| HIGH orchestrator | kimi-k2.7-code | gpt-5.6-luna | Luna (nuevo en Go, 2,050) coordina más barato y libera a K2.7 para sus fases; K2.7 queda de fallback 1 si prefieres su routing. |
| HIGH propose | qwen3.7-max | qwen3.8-max | El francotirador toma el disparo estratégico; 3.7 Max baja a fallback directo. |
| HIGH design | glm-5.2 | glm-5.3 | El semi-francotirador nuevo (220 req) paga una fase de pocas llamadas con el flagship más reciente. Apply y fixer SIGUEN en glm-5.2: los loops exigen las 880. |
| HIGH verify | kimi-k2.7-code | kimi-k3 | Auditoría frontier de 1-2 llamadas; válida porque implementa Zhipu. Si Apply cae a K2.7 → verify conmuta a Qwen3.7 Max. |
| HIGH jd-judge-a | qwen3.7-max | grok-4.5 | xAI: laboratorio incontaminable por construcción. |
| BALANCED propose | qwen3.7-plus | gpt-5.6-luna | Sube la calidad del propose diario sin tocar modelos escasos. |
| BALANCED jd-judge-a | glm-5.2 | glm-5.3 | Bump al flagship en un rol de pocas llamadas; K3 NO entra aquí (regla de laboratorio Moonshot). |
| BALANCED onboard | minimax-m3 | hy3 | M3 recortado a 3,200 cede el volumen de arranque a la promo de Hy3 (M3 fallback). |
| LEAN tasks | deepseek-v4-pro | deepseek-v4-flash | DeepSeek Pro recortado a 1,050 se reserva para spec/juez. |
| LEAN onboard | mimo-v2.5 | hy3 | Promo de volumen; MiMo fallback. |
| Todos: fallbacks | — | actualizados | Luna, Hy3, GLM-5.3 y francotiradores integrados en las cadenas; reglas de conmutación por laboratorio añadidas. |

**8. Fuentes y notas de aplicabilidad**

| **Fuente** | **Uso en el documento** | **URL** |
|----|----|----|
| OpenCode Go docs (Last updated: Aug 19, 2026) | Caps oficiales por modelo, precios por token, multiplicadores de uso, IDs, endpoints y tabla de privacidad — la fuente primaria de esta versión. | https://opencode.ai/docs/go/ |
| Dashboard OpenCode Go + /models (capturas 19/08/2026) | Confirmación del rollout de Muse Spark y de la promo 8x de Hy3 visibles en cuenta. | app.opencode.ai (cuenta propia) |
| Gentle-AI OpenCode SDD Profiles | Perfiles multi-modelo, subagentes SDD y soporte de modelos por fase. | https://github.com/Gentleman-Programming/gentle-ai/blob/main/docs/opencode-profiles.md |
| Gentle-AI agents.md | Agentes sdd-\* y jd-\*, overlay multi-mode. | https://github.com/Gentleman-Programming/gentle-ai/blob/main/docs/agents.md |
| Meta — Introducing Muse Code and Muse Spark 1.2 | Naturaleza del tier Contributor y co-entrenamiento con el harness Muse Code. | https://research.meta.ai/blog/introducing-muse-code-and-muse-spark-1-2 |
| eesel AI — Muse Spark 1.2 review | Reporte de mal desempeño de Muse Spark específicamente en OpenCode. | https://www.eesel.ai/blog/meta-muse-spark-12 |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>Nota de aviso</strong></p>
<p>OpenCode rebalancea límites por valor de uso sin ciclo fijo y el
dashboard solo grafica modelos con consumo reciente — las dos lecciones
de esta versión: (1) el dashboard no es el catálogo — /models y los docs
sí; (2) mismo precio por token NO implica mismo cap — el multiplicador
de uso mensual ($15 vs $60) es lo que separa a un semi-francotirador de
un caballo de trabajo. La lógica transferible es la pirámide de cuatro
niveles más la regla de laboratorio; los números caducan.</p></td>
</tr>
</tbody>
</table>

*Muchas gracias por haber llegado hasta aquí, buena suerte.*
