**Perfiles SDD para Gentle-AI + OpenCode**

**Suscripción ChatGPT (GPT-5.6 Sol / Terra / Luna) + OpenCode Go**

Configuración aplicable de perfiles High, Balanced y Lean con modelos
primarios, fallbacks por fase, reglas de escalamiento y asignación de
agentes Judgment Day.

*Fecha de revisión: 22/07/2026 · Revisión 2 — actualiza GPT-5.5 →
familia GPT-5.6 (Sol/Terra/Luna) y agrega la sección de Judgment Day.*

|  |  |  |  |
|----|----|----|----|
| **Perfil** | **Uso previsto** | **Calidad** | **Costo** |
| **HIGH** | Producción, clientes, cambios críticos, refactors, migraciones y features con riesgo técnico. | Muy alta | Alto |
| **BALANCED** | Perfil diario recomendado: calidad alta, buen cap y uso quirúrgico de modelos premium. | Alta | Medio |
| **LEAN** | Prototipos, scripts, side projects, MVPs rápidos y cambios ligeros con costo mínimo. | Aceptable | Bajo |

# **1. Fases SDD y agentes del perfil**

El orden de esta tabla — y de todas las tablas de perfiles del documento
— replica el orden exacto del editor de perfiles de Gentle-AI (Assign
Models to SDD Phases & JD Agents), para que puedas copiar fila por fila
sin saltar. Nota que sdd-onboard aparece al final de la lista en el TUI,
no después de init.

|  |  |  |
|----|----|----|
| **Fila del TUI** | **UI / Abstracción anterior** | **Función real** |
| gentle-orchestrator | Coordinador (no es fase) | Agente coordinador del perfil: entiende la intención, decide cuándo entrar a SDD, delega a los subagentes de cada fase y sostiene el hilo de la sesión completa. |
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
| jd-judge-a | Judgment Day — Juez A | Primer juez de la revisión dual ciega: veredicto independiente sobre el candidato, sin bash. |
| jd-judge-b | Judgment Day — Juez B | Segundo juez independiente; idealmente de otro laboratorio que el Juez A y que el modelo que implementó. |
| jd-fix-agent | Judgment Day — Fixer | Aplica las correcciones derivadas de los veredictos; los mismos jueces re-juzgan después (no existe agente separado de re-juicio). |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>Regla universal de implementación</strong></p>
<p>Configura los perfiles por las claves exactas sdd-* que muestra la
pantalla. La tabla de este documento no es conceptual: se puede copiar
fase por fase en el editor de perfiles de Gentle-AI/OpenCode.</p></td>
</tr>
</tbody>
</table>

# **2. Base de selección de modelos y límites operativos**

OpenCode Go define límites por valor de uso, no por número fijo
universal. Por eso el modelo más fuerte no siempre es el mejor para cada
fase. El objetivo es reservar modelos caros para las fases donde
realmente cambian el resultado. La cuota de Codex (suscripción ChatGPT)
es el recurso escaso: se gasta solo donde el juicio del modelo cambia la
decisión (propose, design, verify, jueces de Judgment Day).

## **2.1 Familia GPT-5.6 (suscripción ChatGPT vía Codex)**

|  |  |  |  |
|----|----|----|----|
| **Modelo** | **ID recomendado** | **Rol en SDD** | **Notas de plan / esfuerzo** |
| GPT-5.6 Sol | openai/gpt-5.6-sol | Propose crítico, Design, Verify independiente, Juez A en HIGH | Solo Plus/Pro/Business/Enterprise. Esfuerzo medium o superior; medium sustituye al antiguo 5.5 high/xhigh. Sol Pro solo en plan Pro. |
| GPT-5.6 Terra | openai/gpt-5.6-terra | Propose diario, Design balanced, Verify medio, Juez A en BALANCED | Competitivo con GPT-5.5 completo a ~2x menor costo. Único tier disponible en planes Free/Go (solo Codex/Work). |
| GPT-5.6 Luna | openai/gpt-5.6-luna | Init, verificación ligera, Juez A en LEAN | El más rápido y barato de la familia; cubre el rol del antiguo 5.5 Instant/low. |

## **2.2 Modelos OpenCode Go**

|  |  |  |  |
|----|----|----|----|
| **Modelo** | **ID recomendado** | **Req/5h aprox. (18/05/26)** | **Uso SDD recomendado** |
| GLM-5.2 | opencode-go/glm-5.2 | 880 | Apply complejo, Design, Propose, Spec, Verify, refactor largo, migraciones multiarchivo. Juez B en HIGH (Judgment Day). |
| Qwen 3.7 Max | opencode-go/qwen3.7-max | 950 | Design, Propose, Spec, Verify — resolución de arquitectura. Juez B en BALANCED. |
| Kimi K2.7 Code | opencode-go/kimi-k2.7-code | 1,150 | Spec técnico, Apply con tools/MCP, review de código. Fixer por defecto en Judgment Day. |
| MiniMax M3 | opencode-go/minimax-m3 | 9,600 | Onboard, Explore, Design con repo grande o elementos visuales. |
| Qwen 3.7 Plus | opencode-go/qwen3.7-plus | 4,300 | Apply lean, Propose multimodal ligero, Tasks, Spec ligero, fallback estable y eficiente. |
| DeepSeek V4 Pro | opencode-go/deepseek-v4-pro | 3,450 | Explore alternativo, Spec/Design/Verify alternativo bajo costo, depuración económica. |
| DeepSeek V4 Flash | opencode-go/deepseek-v4-flash | 31,650 | Init, Archive, tareas mecánicas y cierres baratos. |
| MiMo-V2.5 | opencode-go/mimo-v2.5 | 30,100 | Archive, Explore barato, operaciones de volumen. |
| MiMo-V2.5-Pro | opencode-go/mimo-v2.5-pro | 3,250 | Review lean y comprobaciones rápidas con mejor calidad que MiMo base. Juez B en LEAN. |

## **2.3 Jerarquía práctica por dimensión**

|  |  |  |
|----|----|----|
| **Dimensión** | **Ranking recomendado** | **Razón** |
| Exploración / onboarding | MiniMax M3 \> GLM-5.2 \> DeepSeek V4 Pro \> Qwen3.7 Plus | M3 gana por contexto + multimodalidad + cap razonable. |
| Spec técnica | Kimi K2.7 Code \> Sol \> GLM-5.2 \> Qwen3.7 Max | Kimi es más implementable y eficiente para specs orientadas a código. |
| Design crítico | Sol \> GLM-5.2 \> MiniMax M3 \> Qwen3.7 Max | La arquitectura requiere criterio, no solo contexto. |
| Tasks | Kimi K2.7 Code \> Qwen3.7 Plus \> MiniMax M3 \> GLM-5.2 | No gastar GLM en descomposición rutinaria. |
| Apply pesado | GLM-5.2 \> Qwen3.7 Max \> Kimi K2.7 Code \> MiniMax M3 \> DeepSeek V4 Pro | GLM se reserva para long-horizon coding real, Qwen en razonamiento. |
| Apply diario / tools | Kimi K2.7 Code \> MiniMax M3 \> DeepSeek V4 Pro | Kimi es mejor default de implementación con herramientas y multimodalidad. |
| Verify / Audit | Sol \> Terra \> Kimi K2.7 Code \> Qwen3.7 Max \> DeepSeek V4 Pro | Verificar con contexto fresco e idealmente otro proveedor/modelo. |
| Judgment Day (jueces) | Sol / Terra + juez Go de otro laboratorio (GLM-5.2, Qwen Max, MiMo Pro) | Los jueces corren sin bash: pesa el juicio en lectura de diff, no el tool-calling. Cross-lab reduce puntos ciegos compartidos. |
| Archive / Cierre | MiMo-V2.5 ≈ DeepSeek V4 Flash \> Qwen3.7 Plus | Cierre no justifica modelos premium. |

\
=

# **3. Perfil HIGH: alto rendimiento / producción**

**sdd-orchestrator-high · Para producción, clientes y cambios de alto
riesgo. Calidad: muy alta · Costo: alto · Velocidad: media · Riesgo
permitido: bajo.**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>Razón del perfil HIGH</strong></p>
<p>Este perfil maximiza calidad y seguridad. Usa MiniMax M3 para
absorber contexto, Kimi K2.7 Code para specs/tareas, GLM-5.2 solo donde
más vale (Apply pesado), y GPT-5.6 Sol para propuesta, arquitectura y
verificación independiente. Sol en esfuerzo medium rinde al nivel del
antiguo 5.5 high/xhigh con menor gasto de cuota; reserva Sol high para
decisiones de arquitectura irreversibles.</p></td>
</tr>
</tbody>
</table>

## **3.1 Configuración primaria por fase**

|  |  |  |  |  |
|----|----|----|----|----|
| **Fase real SDD** | **Rol operativo** | **Modelo primario** | **Esfuerzo** | **Razón** |
| gentle-orchestrator | Coordinador | openai/gpt-5.6-terra | default | El orquestador corre toda la sesión: entiende intención, delega y gatea fases. Necesita fiabilidad y buen routing, no razonamiento máximo — asignarle Sol quema cuota en trabajo de coordinación. Terra sostiene sesiones largas y deja Sol para propose/design/verify/jueces. |
| sdd-init | Arranque rápido | openai/gpt-5.6-luna | default | La inicialización necesita precisión suficiente, no máxima potencia. Luna detecta estructura a costo mínimo y reduce consumo antes de delegar; sube a Terra solo si el repo es atípico. |
| sdd-explore | Exploración profunda | opencode-go/minimax-m3 | default | Exploration favorece 1M context, multimodalidad y buena relación calidad/cap. Aquí M3 supera a usar DeepSeek Pro por defecto. |
| sdd-propose | Decisión estratégica | openai/gpt-5.6-sol | medium | La propuesta define dirección, alcance y trade-offs. Sol medium aporta el criterio que antes exigía 5.5 high/xhigh. |
| sdd-spec | Spec implementable | opencode-go/kimi-k2.7-code | default | Kimi K2.7 Code es especialmente fuerte en instrucciones largas, coding agentic y specs técnicas orientadas a implementación. |
| sdd-design | Arquitectura crítica | openai/gpt-5.6-sol | medium/high | El diseño es donde un error cuesta más. Se prioriza juicio arquitectónico, riesgos, contratos y consistencia. High solo para decisiones irreversibles. |
| sdd-tasks | Plan ejecutable | opencode-go/kimi-k2.7-code | default | Tasks no justifica GLM por defecto. Kimi convierte spec y design en tareas de código accionables con buen control de herramientas. |
| sdd-apply | Implementación pesada | opencode-go/glm-5.2 | high si aparece | GLM-5.2 se reserva para su mejor zona: Apply complejo, long-horizon coding, refactor grande, migraciones y cambios multiarchivo. |
| sdd-verify | Auditoría fresca | openai/gpt-5.6-sol | medium | La verificación debe ser independiente del modelo que implementó. Sol revisa diff, pruebas, edge cases y riesgos con contexto fresco. |
| sdd-archive | Cierre barato | opencode-go/mimo-v2.5 | default | Archive no requiere cerebro premium. MiMo preserva cap de M3/Kimi/GLM para fases críticas. |
| sdd-onboard | Contexto base | opencode-go/minimax-m3 | default | MiniMax M3 es el mejor punto de entrada para absorber repo amplio, diagramas, capturas y contexto visual sin gastar GLM ni Codex. |
| jd-judge-a | JD — Juez A | openai/gpt-5.6-sol | medium | Primer juez de la revisión dual ciega. Sin bash, pesa el juicio en lectura de diff: Sol es el veredicto de máximo criterio en producción. |
| jd-judge-b | JD — Juez B | opencode-go/glm-5.2 | default | Segundo juez de laboratorio distinto al Juez A. Sin herramientas, lo que se necesita es re-leer contexto multiarchivo largo — la zona de GLM. |
| jd-fix-agent | JD — Fixer | opencode-go/kimi-k2.7-code | default | Las correcciones sí son implementación con herramientas activas: aplica el criterio de 'Apply diario/tools'. Los mismos jueces re-juzgan después. |

## **3.2 Fallbacks del perfil HIGH**

Objetivo: mantener continuidad cuando un proveedor se limite o un modelo
falle, sin bajar de golpe a modelos baratos en fases críticas. Configura
estos respaldos en el bloque Fallback models del perfil.

|  |  |  |  |  |
|----|----|----|----|----|
| **Fase** | **Fallback 1** | **Fallback 2** | **Fallback 3** | **Regla de uso** |
| gentle-orchestrator | opencode-go/kimi-k2.7-code | opencode-go/minimax-m3 | opencode-go/qwen3.7-plus | Kimi si Codex está limitado (buen routing con tools); M3 para sesiones de contexto enorme; Qwen Plus como respaldo económico. |
| sdd-init | opencode-go/qwen3.7-plus | opencode-go/deepseek-v4-flash | opencode-go/mimo-v2.5 | Si Codex está limitado, usar Qwen Plus; para repos pequeños bajar a Flash/MiMo. |
| sdd-explore | opencode-go/glm-5.2 | opencode-go/deepseek-v4-pro | opencode-go/qwen3.7-plus | GLM para dependencias profundas; DeepSeek/Qwen para exploración textual sin visuales. |
| sdd-propose | opencode-go/qwen3.7-max | openai/gpt-5.6-terra | opencode-go/glm-5.2 | Qwen Max si Codex falla; Terra si el PRD es simple; GLM si la propuesta depende de contexto del repo. |
| sdd-spec | openai/gpt-5.6-sol | opencode-go/glm-5.2 | opencode-go/qwen3.7-max | Sol medium si hay mucha ambigüedad; GLM si la spec depende de muchos archivos; Qwen Max como tercer respaldo. |
| sdd-design | opencode-go/glm-5.2 | opencode-go/minimax-m3 | opencode-go/qwen3.7-max | GLM para refactor/migración; M3 si hay diagramas/UI; Qwen Max para diseño textual. |
| sdd-tasks | opencode-go/qwen3.7-plus | opencode-go/minimax-m3 | opencode-go/deepseek-v4-pro | Qwen Plus es suficiente para desglose; M3 si requiere contexto; DeepSeek si se busca economía. |
| sdd-apply | opencode-go/kimi-k2.7-code | opencode-go/qwen3.7-max | opencode-go/minimax-m3 | Kimi si hay tools/MCP; Qwen Max respaldo en razonamiento; M3 para apply moderado multimodal. |
| sdd-verify | opencode-go/kimi-k2.7-code | opencode-go/qwen3.7-max | opencode-go/glm-5.2 | Kimi para review técnico; Qwen para razonamiento; GLM si hay que re-leer contexto grande. |
| sdd-archive | opencode-go/deepseek-v4-flash | opencode-go/qwen3.7-plus | opencode-go/mimo-v2.5-pro | Flash/MiMo para cierre; Qwen/MiMo Pro si debe redactar changelog más estructurado. |
| sdd-onboard | opencode-go/glm-5.2 | opencode-go/deepseek-v4-pro | opencode-go/qwen3.7-plus | Escalar a GLM si el repo es enorme; bajar a DeepSeek/Qwen si M3 se agota. |
| jd-judge-a | openai/gpt-5.6-terra | opencode-go/qwen3.7-max | opencode-go/deepseek-v4-pro | Terra mantiene el cross-lab frente a GLM; Qwen Max si todo Codex está limitado. Nunca igualar el laboratorio del Juez B. |
| jd-judge-b | opencode-go/qwen3.7-max | opencode-go/minimax-m3 | opencode-go/deepseek-v4-pro | Sustitutos de otro laboratorio que el Juez A; mantener juez ≠ modelo que implementó (GLM aplicó → no usar GLM de juez). |
| jd-fix-agent | opencode-go/minimax-m3 | opencode-go/qwen3.7-max | opencode-go/deepseek-v4-pro | Evita que el fixer coincida con un juez activo: si corrige quien juzgó, el re-juicio pierde independencia. |

\
=

# **4. Perfil BALANCED: recomendado para uso diario**

**sdd-orchestrator-balanced · Default diario: calidad alta con consumo
controlado. Calidad: alta · Costo: medio · Velocidad: alta · Riesgo
permitido: medio.**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>Razón del perfil BALANCED</strong></p>
<p>Este es el perfil recomendado por defecto. MiniMax M3 cubre
onboarding/exploración/diseño, Kimi K2.7 Code cubre spec/apply, Qwen
Plus cubre tasks, y Codex se reserva para propuesta (Terra) y
verificación fuerte (Sol). Terra iguala al antiguo GPT-5.5 completo, así
que las fases que antes usaban 5.5 medium suben de calidad sin subir de
costo. Evita usar GLM-5.2 salvo como fallback de Apply pesado.</p></td>
</tr>
</tbody>
</table>

## **4.1 Configuración primaria por fase**

|  |  |  |  |  |
|----|----|----|----|----|
| **Fase real SDD** | **Rol operativo** | **Modelo primario** | **Esfuerzo** | **Razón** |
| gentle-orchestrator | Coordinador | openai/gpt-5.6-terra | default | Mismo criterio que en HIGH: el coordinador necesita fiabilidad de routing durante toda la sesión, no razonamiento máximo. Terra es el punto óptimo; si prefieres no gastar Codex en coordinación, Kimi K2.7 Code es el mejor sustituto Go. |
| sdd-init | Arranque eficiente | openai/gpt-5.6-luna | default | Luna detecta estructura sin consumir modelos Go críticos ni razonamiento pesado; es el sustituto natural del antiguo 5.5 low. |
| sdd-explore | Exploración | opencode-go/minimax-m3 | default | Es el mejor equilibrio para navegar repo, UI, diagramas y dependencias con buen costo por iteración. |
| sdd-propose | Propuesta | openai/gpt-5.6-terra | default | Terra cumple de sobra para proponer ruta y alcance en uso frecuente. Escala a Sol low/medium solo si hay mayor riesgo. |
| sdd-spec | Spec técnica | opencode-go/kimi-k2.7-code | default | Kimi mantiene la spec cerca del código real y reduce sobrepensamiento frente a usar modelos de razonamiento para todo. |
| sdd-design | Diseño con repo | opencode-go/minimax-m3 | default | Balancea arquitectura con contexto y visuales. Deja Sol para verify y casos críticos. |
| sdd-tasks | Tareas | opencode-go/qwen3.7-plus | default | Qwen Plus es barato, consistente y suficiente para descomponer tareas sin gastar Kimi/M3. |
| sdd-apply | Implementación diaria | opencode-go/kimi-k2.7-code | default | Kimi es el default de Apply por su rendimiento agentic, herramientas y eficiencia. GLM queda para escalamiento pesado. |
| sdd-verify | Control fuerte | openai/gpt-5.6-sol | low/medium | Es la fase donde más rinde gastar Sol en este perfil: un verificador independiente con razonamiento fuerte compensa el uso de modelos Go en spec/design/apply. |
| sdd-archive | Cierre | opencode-go/mimo-v2.5 | default | MiMo tiene cap muy alto y es suficiente para resumen, bitácora, notas y cierre operativo. |
| sdd-onboard | Contexto base | opencode-go/minimax-m3 | default | M3 ofrece gran contexto y lectura de proyecto con mejor cap que GLM y mejor perfil multimodal que alternativas económicas. |
| jd-judge-a | JD — Juez A | openai/gpt-5.6-terra | default | Terra da veredicto de calidad 5.5-completo a costo diario. Escala a Sol low/medium solo si el ciclo toca código de riesgo. |
| jd-judge-b | JD — Juez B | opencode-go/qwen3.7-max | default | Rankea alto en razonamiento/juicio (sección 2.3) y su cap (~950 req/5h) aguanta bien un rol que se invoca poco por ciclo. |
| jd-fix-agent | JD — Fixer | opencode-go/kimi-k2.7-code | default | Igual que en HIGH: las correcciones son implementación con tools, la mejor zona de Kimi. |

## **4.2 Fallbacks del perfil BALANCED**

Objetivo: preservar la relación costo/calidad. Los respaldos escalan a
modelos fuertes solo cuando la fase lo justifica y bajan a modelos
baratos en tareas mecánicas.

|  |  |  |  |  |
|----|----|----|----|----|
| **Fase** | **Fallback 1** | **Fallback 2** | **Fallback 3** | **Regla de uso** |
| gentle-orchestrator | opencode-go/kimi-k2.7-code | opencode-go/minimax-m3 | opencode-go/qwen3.7-plus | Kimi si Codex está limitado; M3 para sesiones de contexto enorme; Qwen Plus como respaldo económico. |
| sdd-init | opencode-go/qwen3.7-plus | opencode-go/mimo-v2.5 | opencode-go/deepseek-v4-flash | Si Codex no está disponible, Qwen Plus; para inspección trivial, Flash/MiMo. |
| sdd-explore | opencode-go/deepseek-v4-pro | opencode-go/glm-5.2 | opencode-go/qwen3.7-plus | DeepSeek como respaldo eficiente; GLM si hay relación multiarchivo muy larga. |
| sdd-propose | opencode-go/qwen3.7-max | opencode-go/qwen3.7-plus | openai/gpt-5.6-sol | Qwen Max/Plus si Codex está limitado; Sol medium si la decisión es crítica. |
| sdd-spec | opencode-go/minimax-m3 | opencode-go/qwen3.7-max | opencode-go/glm-5.2 | M3 si la spec depende de repo/visual; Qwen Max para razonamiento; GLM para contexto extremo. |
| sdd-design | openai/gpt-5.6-sol | opencode-go/glm-5.2 | opencode-go/qwen3.7-max | Escalar a Sol medium para arquitectura crítica; GLM para migración/refactor. |
| sdd-tasks | opencode-go/kimi-k2.7-code | opencode-go/minimax-m3 | opencode-go/deepseek-v4-pro | Kimi si las tasks deben incluir herramientas; M3/DeepSeek según contexto/costo. |
| sdd-apply | opencode-go/glm-5.2 | opencode-go/minimax-m3 | opencode-go/deepseek-v4-pro | GLM para apply pesado; M3 para cambios medianos; DeepSeek para economía. |
| sdd-verify | opencode-go/kimi-k2.7-code | opencode-go/qwen3.7-max | openai/gpt-5.6-luna | Kimi para review técnico; Qwen para juicio; Luna por economía solo si las fases previas usaron modelos adecuados a la tarea — de lo contrario se compromete calidad. |
| sdd-archive | opencode-go/deepseek-v4-flash | opencode-go/qwen3.7-plus | opencode-go/deepseek-v4-pro | Flash para cierre barato; Qwen/DeepSeek si debe generar notas más cuidadas. |
| sdd-onboard | opencode-go/deepseek-v4-pro | opencode-go/qwen3.7-plus | opencode-go/glm-5.2 | DeepSeek/Qwen para ahorrar; GLM solo si el onboarding exige lectura masiva. |
| jd-judge-a | openai/gpt-5.6-sol | opencode-go/glm-5.2 | opencode-go/deepseek-v4-pro | Sol low como escalamiento si el ciclo es crítico; GLM/DeepSeek si Codex está limitado (mantienen cross-lab frente a Qwen). |
| jd-judge-b | opencode-go/glm-5.2 | opencode-go/mimo-v2.5-pro | opencode-go/deepseek-v4-pro | Sustitutos de laboratorio distinto al Juez A; MiMo Pro si hay que cuidar cap de GLM. |
| jd-fix-agent | opencode-go/qwen3.7-plus | opencode-go/minimax-m3 | opencode-go/deepseek-v4-pro | Qwen Plus para fixes ligeros; M3 si las correcciones cruzan varios archivos. Evita que el fixer coincida con un juez activo. |

# **5. Perfil LEAN: eficiencia de recursos**

**sdd-orchestrator-lean · Para proyectos ligeros, MVPs, scripts y
prototipos. Calidad: aceptable · Costo: bajo · Velocidad: muy alta ·
Riesgo permitido: alto.**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>Razón del perfil LEAN</strong></p>
<p>Este perfil maximiza velocidad y cap. Usa modelos baratos para
init/onboard/explore/archive, Qwen Plus para propuesta/apply, DeepSeek
Pro para spec/tasks y un solo punto fuerte en Design con MiniMax M3 para
evitar deuda técnica temprana. En LEAN la lógica se invierte respecto a
HIGH: quema el crédito de Go en el volumen de tokens de implementación y
reserva Codex (Luna/Terra) para verificación puntual.</p></td>
</tr>
</tbody>
</table>

## **5.1 Configuración primaria por fase**

|  |  |  |  |  |
|----|----|----|----|----|
| **Fase real SDD** | **Rol operativo** | **Modelo primario** | **Esfuerzo** | **Razón** |
| gentle-orchestrator | Coordinador | opencode-go/minimax-m3 | default | En LEAN el coordinador va en Go, no en Codex: corre toda la sesión y M3 combina cap alto (~9,600 req/5h), contexto amplio y buen routing sin gastar cuota ChatGPT en coordinación. |
| sdd-init | Arranque mínimo | opencode-go/deepseek-v4-flash | default | Flash tiene cap altísimo y sirve para detectar estructuras de proyectos ligeros sin gastar modelos medios. |
| sdd-explore | Exploración barata | opencode-go/mimo-v2.5 | default | Para scripts, MVPs y side projects conviene preservar M3/Kimi. Escalar solo si la exploración se vuelve compleja. |
| sdd-propose | Propuesta simple | opencode-go/qwen3.7-plus | default | Qwen Plus mantiene coherencia de alcance y decisiones con buen cap, sin usar Codex ni modelos premium. |
| sdd-spec | Spec ligera | opencode-go/deepseek-v4-pro | default | Suficiente para especificaciones, criterios de aceptación y contratos. |
| sdd-design | Punto fuerte único | opencode-go/minimax-m3 | default | Incluso en lean, el diseño merece un modelo mejor para evitar deuda técnica. M3 da contexto y visión sin costo de GLM. |
| sdd-tasks | Tareas baratas | opencode-go/deepseek-v4-pro | default | DeepSeek descompone el trabajo en un task list atómico y accionable. |
| sdd-apply | Implementación aceptable | opencode-go/qwen3.7-plus | default | Qwen Plus da escritura y calidad de código aceptable, ejecuta en bucle las tareas aprobadas de forma veloz; M3 sigue siendo recomendable si sube la complejidad. |
| sdd-verify | Revisión ligera | openai/gpt-5.6-luna | default | Luna cubre la verificación final ligera con contexto fresco y proveedor distinto, a costo mínimo de cuota. Sube a Terra si se tocaron 2+ archivos. Si no hay Codex, usar MiMo Pro / Qwen Plus. |
| sdd-archive | Cierre mínimo | opencode-go/mimo-v2.5 | default | Archive es mecánico: resumen, estado final y notas. MiMo maximiza velocidad y cap. |
| sdd-onboard | Contexto ligero | opencode-go/mimo-v2.5 | default | MiMo permite volumen casi ilimitado para onboarding simple, lectura básica y documentación. |
| jd-judge-a | JD — Juez A | openai/gpt-5.6-luna | default | Veredicto barato con proveedor distinto a los modelos Go que implementaron. Si el cambio tocó 2+ archivos, la regla manda subir el perfil completo, no solo el juez. |
| jd-judge-b | JD — Juez B | opencode-go/mimo-v2.5-pro | default | Review lean con mejor calidad que MiMo base a cap alto. Para cambios triviales puedes desactivarlo y quedarte solo con el veredicto del Juez A. |
| jd-fix-agent | JD — Fixer | opencode-go/qwen3.7-plus | default | Coherente con el Apply del perfil: fixes rápidos y baratos; sube a Kimi si la corrección se complica. |

## **5.2 Fallbacks del perfil LEAN**

Objetivo: mantener el costo bajo, pero permitir escalamiento puntual
cuando una tarea ligera deja de serlo. El perfil Lean no debe usarse
para autenticación, pagos, datos sensibles, migraciones o producción
crítica sin escalar a Balanced/High.

|  |  |  |  |  |
|----|----|----|----|----|
| **Fase** | **Fallback 1** | **Fallback 2** | **Fallback 3** | **Regla de uso** |
| gentle-orchestrator | opencode-go/qwen3.7-plus | openai/gpt-5.6-luna | opencode-go/kimi-k2.7-code | Qwen Plus si M3 se agota; Luna como respaldo barato de Codex; Kimi si la sesión exige mucho routing con tools. |
| sdd-init | opencode-go/mimo-v2.5 | opencode-go/deepseek-v4-pro | opencode-go/qwen3.7-plus | Subir solo si el arranque detecta estructura confusa o scripts no estándar. |
| sdd-explore | opencode-go/deepseek-v4-flash | opencode-go/qwen3.7-plus | opencode-go/deepseek-v4-pro | Mantener barato; escalar a Pro si hay múltiples archivos o flujos. |
| sdd-propose | opencode-go/deepseek-v4-pro | openai/gpt-5.6-terra | opencode-go/minimax-m3 | DeepSeek para más código; Terra para criterio de producto (sustituye al antiguo 5.5 medium/low); M3 si hay repo/visual amplio. |
| sdd-spec | opencode-go/qwen3.7-plus | opencode-go/kimi-k2.7-code | opencode-go/minimax-m3 | Subir a Kimi cuando la spec debe ser muy implementable. |
| sdd-design | opencode-go/deepseek-v4-pro | opencode-go/qwen3.7-plus | openai/gpt-5.6-terra | Bajar a DeepSeek/Qwen si M3 no está disponible; Terra para decisión final en casos puntuales de mayor complejidad. |
| sdd-tasks | opencode-go/deepseek-v4-flash | opencode-go/mimo-v2.5 | opencode-go/qwen3.7-plus | Tasks simples pueden bajar a Flash/MiMo; Qwen si requiere multimodal. |
| sdd-apply | opencode-go/minimax-m3 | opencode-go/kimi-k2.7-code | opencode-go/deepseek-v4-pro | M3/Kimi si aumenta complejidad; DeepSeek para rigor en el razonamiento. |
| sdd-verify | opencode-go/mimo-v2.5-pro | opencode-go/deepseek-v4-pro | opencode-go/qwen3.7-plus | Si Codex está limitado: MiMo Pro / DeepSeek; Qwen como respaldo. |
| sdd-archive | opencode-go/deepseek-v4-flash | opencode-go/qwen3.7-plus | opencode-go/mimo-v2.5-pro | Flash/MiMo para cierre; Qwen/MiMo Pro si requiere notas publicables. |
| sdd-onboard | opencode-go/deepseek-v4-flash | opencode-go/qwen3.7-plus | opencode-go/deepseek-v4-pro | Flash/MiMo para volumen; Qwen/Pro cuando el onboarding necesita más criterio. |
| jd-judge-a | opencode-go/qwen3.7-plus | opencode-go/deepseek-v4-pro | openai/gpt-5.6-terra | Qwen/DeepSeek si Codex está limitado; Terra como escalamiento si el cambio resultó menos trivial de lo esperado. |
| jd-judge-b | opencode-go/deepseek-v4-pro | opencode-go/qwen3.7-plus | opencode-go/minimax-m3 | Sustitutos baratos de laboratorio distinto al Juez A; M3 si el diff exige contexto amplio. |
| jd-fix-agent | opencode-go/deepseek-v4-pro | opencode-go/kimi-k2.7-code | opencode-go/mimo-v2.5 | DeepSeek para fixes con rigor; Kimi si sube la complejidad; MiMo para correcciones mecánicas. |

# **6. Agentes Judgment Day: criterio de selección**

Las asignaciones de jd-judge-a, jd-judge-b y jd-fix-agent ya están
integradas en las tablas de cada perfil (secciones 3, 4 y 5), en el
mismo orden del TUI. Esta sección explica el criterio y da la vista
comparada entre perfiles.

Judgment Day es el flujo de revisión dual ciega de Gentle-AI: dos jueces
revisan el mismo candidato de forma independiente y sin ver el veredicto
del otro, un fixer aplica las correcciones y los jueces re-juzgan. Los
subagentes de Judgment Day corren con bash deshabilitado: puro
razonamiento sobre diff, spec y contexto, cero tool-calling. Eso cambia
el criterio de selección respecto al resto del documento — la fortaleza
agentic/tools de Kimi pierde peso en el rol de juez, y lo que importa es
juicio sobre código en modo lectura y capacidad de sostener diffs
largos.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>Principio de diversidad (doble)</strong></p>
<p>La regla del documento de 'verificar con otro proveedor' aplica doble
aquí: los dos jueces deben ser de laboratorios distintos entre sí y, de
preferencia, distintos del modelo que implementó. Jueces del mismo
laboratorio comparten sesgos de entrenamiento y puntos ciegos; el valor
de la revisión dual ciega está justamente en que los errores que uno
normaliza el otro los marque.</p></td>
</tr>
</tbody>
</table>

## **6.1 Vista comparada entre perfiles (resumen)**

|  |  |  |  |
|----|----|----|----|
| **Fila del TUI** | **HIGH** | **BALANCED** | **LEAN** |
| jd-judge-a | openai/gpt-5.6-sol (medium) | openai/gpt-5.6-terra | openai/gpt-5.6-luna |
| jd-judge-b | opencode-go/glm-5.2 | opencode-go/qwen3.7-max | opencode-go/mimo-v2.5-pro |
| jd-fix-agent | opencode-go/kimi-k2.7-code | opencode-go/kimi-k2.7-code | opencode-go/qwen3.7-plus |

*El re-juicio no tiene fila propia en el TUI: lo ejecutan los mismos
jd-judge-a / jd-judge-b sobre el candidato corregido, así que queda
cubierto automáticamente con las asignaciones de arriba.*

## **6.2 Razonamiento de la asignación**

|  |  |
|----|----|
| **Decisión** | **Razón** |
| GLM-5.2 como Juez B en HIGH (no Kimi) | Sin bash, lo que se necesita del segundo juez es capacidad de re-leer contexto multiarchivo largo y relaciones cruzadas — exactamente la zona donde este documento ubica a GLM. Kimi brilla con herramientas, que aquí están apagadas. |
| Qwen 3.7 Max como Juez B en BALANCED | Rankea alto en razonamiento/juicio en la jerarquía de la sección 2.3, y su cap (~950 req/5h) aguanta bien un rol que se invoca pocas veces por ciclo. |
| Kimi K2.7 Code como Fixer | Las correcciones sí son fase de implementación con herramientas activas: vuelve a aplicar el criterio de 'Apply diario/tools' de la sección 2.3. |
| Luna + MiMo Pro en LEAN | El ritual dual en un script de 40 líneas es overhead puro. Si el cambio es trivial, desactiva el segundo juez y deja solo a Luna; si el cambio tocó 2+ archivos, la regla de escalamiento manda subir el perfil completo, no solo los jueces. |
| Re-juicio con los mismos jueces | El re-juicio valida que el fixer cerró los hallazgos originales; cambiar de juez a mitad de ciclo rompe la trazabilidad del veredicto. En LEAN, si el cambio es trivial, basta el veredicto de jd-judge-a. |
| No asignar Sol al gentle-orchestrator | El coordinador aparece primero en el TUI y es tentador darle el modelo más fuerte, pero corre durante toda la sesión haciendo routing y delegación: Sol ahí quema cuota sin mejorar el resultado. Terra (HIGH/BALANCED) o MiniMax M3 (LEAN) son el punto correcto. |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>Configuración</strong></p>
<p>Verifica la versión de gentle-ai instalada: la configuración de
modelos de Judgment Day desde el TUI fue solicitada en el issue #208. Si
tu versión aún no la expone en pantalla, los modelos se editan
directamente en el overlay opencode.json que gentle-ai genera para
OpenCode. Los subagentes de Judgment Day aparecen junto a los sdd-* en
la lista de agentes.</p></td>
</tr>
</tbody>
</table>

# **7. Guía directa de implementación en Gentle-AI / OpenCode**

|  |  |  |
|----|----|----|
| **Paso** | **Acción** | **Detalle implementable** |
| 1 | Conectar proveedores | En OpenCode ejecuta /connect. La suscripción ChatGPT entra vía Codex (OAuth); conecta también OpenCode Go con tu API key de Zen. Luego ejecuta /models para verificar los IDs reales — es probable que los tiers aparezcan como openai/gpt-5.6-sol, -terra y -luna o variantes Codex. |
| 2 | Crear perfil | Ejecuta gentle-ai, entra en OpenCode SDD Profiles, crea o edita un perfil con nombre slug: high, balanced o lean. |
| 3 | Configurar primarios | En Assign Models to SDD Phases & JD Agents, asigna el modelo primario fila por fila siguiendo la tabla del perfil elegido — las tablas de este documento ya replican el orden exacto del TUI: gentle-orchestrator primero, luego sdd-init → sdd-archive, sdd-onboard al final y los tres agentes jd-\*. Evita 'Set all SDD phases': anula la asignación por fase que es el punto de todo el perfil. |
| 4 | Configurar esfuerzo | En Reasoning effort, fija el nivel solo donde el proveedor lo permita. Sol acepta medium o superior (Sol Pro solo en plan Pro — no lo busques en Plus); Terra y Luna funcionan en default. No fuerces esfuerzo si el picker no lo expone. |
| 5 | Configurar fallbacks | En Fallback models, agrega al menos dos respaldos por fase. Evita que primario y fallback dependan del mismo proveedor cuando la fase sea crítica. |
| 6 | Configurar Judgment Day | Asigna Juez A / Juez B / Fixer según la tabla de la sección 6.1 (desde el TUI si tu versión lo expone, o en el overlay opencode.json). |
| 7 | Activar perfil | Guarda, sincroniza y activa el perfil. En OpenCode usa Tab para cambiar al orchestrator del perfil antes de ejecutar SDD. |
| 8 | Validar en proyecto real | Haz una tarea pequeña con /sdd-new o el flujo SDD equivalente. Verifica que delegue a los subagentes correctos, que los fallbacks no queden en 0/10 y que Judgment Day invoque a ambos jueces. |

## **7.1 Reglas de escalamiento durante el trabajo**

|  |  |
|----|----|
| **Regla** | **Criterio** |
| Subir de Lean a Balanced | Si se tocan 2+ archivos no triviales, hay backend+frontend, hay pruebas fallando o aparece ambigüedad funcional. |
| Subir de Balanced a High | Si hay producción, cliente, seguridad, auth, pagos, migración, base de datos, permisos, refactor grande o riesgo de regresión. |
| Activar GLM-5.2 | Solo si Apply requiere contexto largo, cambios cruzados, migración o debugging persistente. No usarlo en Tasks por defecto. |
| Activar Sol en Verify | Siempre que el modelo que aplicó cambios sea Go y el perfil sea HIGH o BALANCED. La verificación debe hacerse con contexto fresco y, preferentemente, otro proveedor. En LEAN el techo es Terra. |
| Subir esfuerzo de Sol a high | Solo en decisiones de arquitectura irreversibles o auditorías de seguridad. Sol medium cubre el resto de los casos que antes exigían 5.5 high/xhigh. |
| No dejar fallbacks vacíos | La UI muestra Fallback models por fase. En perfiles serios, 0/10 fallbacks configurados es frágil. |

## **7.2 Tabla de sustitución GPT-5.5 → GPT-5.6 (referencia rápida)**

Si conservas una copia anterior de este documento o perfiles ya
configurados, esta es la traducción directa:

|  |  |  |
|----|----|----|
| **El documento anterior decía** | **Sustituir por** | **Nota** |
| openai/gpt-5_5 high/xhigh | openai/gpt-5.6-sol medium/high | Requiere plan Plus o superior. El nivel xhigh ya no existe como tal: Sol medium rinde al nivel del antiguo 5.5 xhigh con menor gasto de cuota. |
| openai/gpt-5_5 medium | openai/gpt-5.6-terra default | Terra es competitivo con GPT-5.5 completo, por lo que las fases '5.5 medium' quedan cubiertas de sobra. Escala a Sol low si la decisión es crítica. |
| openai/gpt-5_5 low / Instant | openai/gpt-5.6-luna | Luna reemplaza el rol Instant/low: casi el rendimiento pico de 5.5 a fracción del costo. |

# **8. Fuentes y notas de aplicabilidad**

|  |  |  |
|----|----|----|
| **Fuente** | **Uso en el documento** | **URL** |
| Gentle-AI OpenCode SDD Profiles | Confirma perfiles multi-modelo, 10 subagentes SDD, Tab para cambiar perfiles y soporte de modelos por fase. | https://github.com/Gentleman-Programming/gentle-ai/blob/main/docs/opencode-profiles.md |
| Gentle-AI agents.md | Documenta los agentes de fase (sdd-init a sdd-onboard) más los agentes Judgment Day y el overlay multi-mode de OpenCode. | https://github.com/Gentleman-Programming/gentle-ai/blob/main/docs/agents.md |
| Gentle-AI intended usage | Describe SDD, multi-mode en OpenCode, sub-agentes, delegación y reglas prácticas de complejidad. | https://github.com/Gentleman-Programming/gentle-ai/blob/main/docs/intended-usage.md |
| Gentle-AI releases | Confirma que los subagentes de Judgment Day y review de OpenCode corren con bash deshabilitado. | https://github.com/Gentleman-Programming/gentle-ai/releases |
| OpenCode Go docs | Lista modelos actuales, IDs, límites por valor de uso, requests estimados y formato provider/model. | https://opencode.ai/docs/go/ |
| OpenAI GPT-5.6 | Anuncio de la familia Sol/Terra/Luna: tiers, disponibilidad por plan, esfuerzo de razonamiento y precios. | https://openai.com/index/gpt-5-6/ |
| OpenAI Help Center — GPT-5.6 en ChatGPT | Disponibilidad por plan: Sol solo en Plus/Pro/Business/Enterprise; Terra en Free/Go dentro de Codex/Work. | https://help.openai.com/en/articles/20001325 |
| Kimi K2.7 Code docs | Capacidades long-horizon coding, agentic improvements, 256K context y comportamiento de thinking/tools. | https://platform.kimi.ai/docs/guide/kimi-k2-7-code-quickstart |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>Nota de aviso</strong></p>
<p>Este documento es universal por estructura, pero los nombres exactos
de modelos cambian. La regla definitiva es: primero /models, luego
ajustar provider/model en cada fila. Si OpenCode muestra los tiers con
otro sufijo (por ejemplo variantes Codex de Sol/Terra/Luna), sustituye
por la misma categoría de uso: Sol = criterio máximo, Terra = trabajo
diario, Luna = velocidad/economía. Los nombres pueden variar pero no es
el propósito colocar el nombre exacto sino una lógica general de
aplicación; el documento solo pretende brindar una ayuda básica — tú
debes decidir el mejor camino y elección para alcanzar tus
objetivos.</p></td>
</tr>
</tbody>
</table>

*Muchas gracias por haber llegado hasta aquí, buena suerte.*
