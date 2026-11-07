from collections import deque
from typing import Dict, List, Any, Optional


def compute_edge_capacity(cap_origen: float, cap_destino: float, distancia_km: float, tiempo_min: int, factor: float = 1.0) -> float:
    """
    Calcula la capacidad efectiva de transferencia c(u,v) en la arista dirigida (u -> v)
    en función de la capacidad operativa de los nodos y el factor logístico de tiempo/distancia.
    """
    base_cap = min(cap_origen, cap_destino)
    efficiency = min(1.25, max(0.35, 60.0 / max(25.0, float(tiempo_min))))
    capacity = round(base_cap * efficiency * factor, 2)
    return max(1.0, capacity)


def edmonds_karp_max_flow(
    nodes: List[Dict[str, Any]],
    edges: List[Dict[str, Any]],
    source_id: Optional[int] = None,
    sink_id: Optional[int] = None,
    factor_capacidad: float = 1.0,
) -> Dict[str, Any]:
    """
    Implementación del algoritmo de Edmonds-Karp (Ford-Fulkerson con BFS)
    para calcular el flujo máximo, flujo por arista, aristas saturadas (cuellos de botella)
    y el corte mínimo (S, T) sobre la red logística de EcoRAEE Cloud.
    """
    if not nodes:
        return {
            "flujo_maximo": 0,
            "flujo_por_arista": [],
            "corte_minimo": {"conjunto_S": [], "conjunto_T": [], "aristas_criticas": [], "capacidad_corte": 0},
            "rutas_aumentantes": [],
        }

    node_map = {n["id_nodo"]: n for n in nodes}
    sorted_node_ids = sorted(node_map.keys())

    if source_id is None or source_id not in node_map:
        source_id = sorted_node_ids[0]
    if sink_id is None or sink_id not in node_map:
        sink_id = sorted_node_ids[-1]

    # Construir grafo residual
    adj: Dict[int, List[int]] = {nid: [] for nid in sorted_node_ids}
    capacity: Dict[tuple, float] = {}
    flow: Dict[tuple, float] = {}
    edge_meta: Dict[tuple, Dict[str, Any]] = {}

    for e in edges:
        u = e["id_nodo_origen"]
        v = e["id_nodo_destino"]
        if u not in node_map or v not in node_map:
            continue

        cap_u = float(node_map[u]["capacidad_nodo"])
        cap_v = float(node_map[v]["capacidad_nodo"])
        dist = float(e["distancia_km"])
        t_min = int(e["tiempo_estimado_min"])

        c_uv = compute_edge_capacity(cap_u, cap_v, dist, t_min, factor_capacidad)

        if v not in adj[u]:
            adj[u].append(v)
        if u not in adj[v]:
            adj[v].append(u)

        capacity[(u, v)] = capacity.get((u, v), 0.0) + c_uv
        capacity.setdefault((v, u), 0.0)
        flow[(u, v)] = 0.0
        flow.setdefault((v, u), 0.0)
        edge_meta[(u, v)] = {
            "id_arista": e["id_arista"],
            "id_nodo_origen": u,
            "nombre_origen": node_map[u]["tipo_nodo"],
            "id_nodo_destino": v,
            "nombre_destino": node_map[v]["tipo_nodo"],
            "distancia_km": dist,
            "tiempo_estimado_min": t_min,
            "capacidad": round(c_uv, 2),
        }

    max_flow = 0.0
    augmenting_paths = []

    # Búsqueda BFS de caminos aumentantes (Edmonds-Karp)
    while True:
        parent: Dict[int, Optional[int]] = {nid: None for nid in sorted_node_ids}
        parent[source_id] = source_id
        queue = deque([source_id])

        while queue and parent[sink_id] is None:
            u = queue.popleft()
            for v in adj[u]:
                residual = capacity.get((u, v), 0.0) - flow.get((u, v), 0.0)
                if parent[v] is None and residual > 1e-6:
                    parent[v] = u
                    queue.append(v)

        if parent[sink_id] is None:
            break

        # Reconstruir camino y encontrar cuello de botella del camino
        path_nodes = []
        curr = sink_id
        path_flow = float("inf")
        while curr != source_id:
            prev = parent[curr]
            residual = capacity[(prev, curr)] - flow[(prev, curr)]
            path_flow = min(path_flow, residual)
            path_nodes.append(curr)
            curr = prev
        path_nodes.append(source_id)
        path_nodes.reverse()

        # Actualizar flujos residuales
        curr = sink_id
        while curr != source_id:
            prev = parent[curr]
            flow[(prev, curr)] += path_flow
            flow[(curr, prev)] -= path_flow
            curr = prev

        max_flow = round(max_flow + path_flow, 2)
        augmenting_paths.append({
            "camino_nodos": path_nodes,
            "camino_nombres": [node_map[nid]["tipo_nodo"] for nid in path_nodes],
            "flujo_aportado": round(path_flow, 2),
        })

    # Determinar corte mínimo (S, T): nodos alcanzables desde source en grafo residual
    visited = set([source_id])
    q = deque([source_id])
    while q:
        u = q.popleft()
        for v in adj[u]:
            residual = capacity.get((u, v), 0.0) - flow.get((u, v), 0.0)
            if v not in visited and residual > 1e-6:
                visited.add(v)
                q.append(v)

    set_S = sorted(list(visited))
    set_T = sorted([nid for nid in sorted_node_ids if nid not in visited])

    flujo_por_arista = []
    aristas_criticas = []
    capacidad_corte = 0.0

    for (u, v), meta in edge_meta.items():
        f_uv = round(max(0.0, flow.get((u, v), 0.0)), 2)
        c_uv = meta["capacidad"]
        pct = round((f_uv / c_uv) * 100.0, 1) if c_uv > 0 else 0.0
        saturada = abs(c_uv - f_uv) <= 0.05

        item = {
            **meta,
            "flujo": f_uv,
            "holgura": round(max(0.0, c_uv - f_uv), 2),
            "porcentaje_uso": pct,
            "saturada": saturada,
            "en_corte_minimo": (u in visited and v not in visited),
        }
        flujo_por_arista.append(item)

        if u in visited and v not in visited:
            aristas_criticas.append(item)
            capacidad_corte = round(capacidad_corte + c_uv, 2)

    return {
        "nodo_origen": node_map[source_id],
        "nodo_sumidero": node_map[sink_id],
        "factor_capacidad": factor_capacidad,
        "flujo_maximo": round(max_flow, 2),
        "flujo_por_arista": flujo_por_arista,
        "corte_minimo": {
            "conjunto_S": [{"id_nodo": nid, "tipo_nodo": node_map[nid]["tipo_nodo"]} for nid in set_S],
            "conjunto_T": [{"id_nodo": nid, "tipo_nodo": node_map[nid]["tipo_nodo"]} for nid in set_T],
            "aristas_criticas": aristas_criticas,
            "capacidad_corte": capacidad_corte,
        },
        "rutas_aumentantes": augmenting_paths,
    }


def get_formalized_business_rules() -> List[Dict[str, Any]]:
    """
    RF-MD-01: Cinco reglas de negocio formalizadas mediante lógica proposicional,
    operadores booleanos y tablas de verdad asociadas a las restricciones de EcoRAEE Cloud.
    """
    return [
        {
            "codigo": "RN-01",
            "titulo": "Identificación única y registro en historial inicial",
            "proposiciones": {
                "p": "El dispositivo posee un número de serie único (num_serie)",
                "q": "El dispositivo está vinculado a un lote válido (id_lote)",
                "r": "Se genera el estado inicial secuencial (id_secuencia = 1) en HISTORIAL_ESTADOS",
            },
            "formula": "(p ∧ q) → r",
            "implementacion_sql_api": "UQ_DISPOSITIVO_SERIE + FK_DISPOSITIVO_LOTE + Inserción transaccional de secuencia 1",
        },
        {
            "codigo": "RN-02",
            "titulo": "Autorización de evaluación técnica por rol",
            "proposiciones": {
                "p": "El usuario intenta registrar o modificar una EVALUACION_TECNICA",
                "q": "El usuario tiene rol 'Tecnico Clasificador' o 'Administrador del Sistema'",
            },
            "formula": "p → q",
            "implementacion_sql_api": "Validación de rol en endpoint POST/PUT /evaluaciones y FK_EVAL_USUARIO",
        },
        {
            "codigo": "RN-03",
            "titulo": "Validación de transferencia entre centros distintos",
            "proposiciones": {
                "p": "Existe centro de origen válido (id_centro_origen)",
                "q": "Existe centro de destino válido (id_centro_destino)",
                "r": "El centro de origen es distinto del centro de destino (origen ≠ destino)",
            },
            "formula": "TransferenciaValida ↔ (p ∧ q ∧ r)",
            "implementacion_sql_api": "CK_MOV_CENTROS_DISTINTOS (id_centro_origen <> id_centro_destino)",
        },
        {
            "codigo": "RN-04",
            "titulo": "Restricción de asignación para equipos en Disposición Final",
            "proposiciones": {
                "p": "La clasificación técnica es 'Disposicion Final'",
                "q": "El destino de tratamiento es donación o beneficiario educativo",
            },
            "formula": "p → ¬q",
            "implementacion_sql_api": "Validación en POST /tratamientos impidiendo asignar a beneficiario si es Disposición Final",
        },
        {
            "codigo": "RN-08",
            "titulo": "Cierre de trazabilidad con tratamiento y evidencia válida",
            "proposiciones": {
                "p": "Existe registro de TRATAMIENTO con destino final y fecha de cierre",
                "q": "Existe EVIDENCIA en formato permitido (PDF, JPG, PNG, DOCX)",
                "r": "El dispositivo pasa al estado 6 ('Cerrado / Trazabilidad Completa')",
            },
            "formula": "(p ∧ q) ↔ r",
            "implementacion_sql_api": "CK_EVIDENCIA_TIPO + actualización atómica de HISTORIAL_ESTADOS a estado 6",
        },
    ]

