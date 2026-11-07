USE EcoRAEE_DB;
GO
DECLARE @id_dispositivo_consulta INT = 1;

SELECT 
    d.id_dispositivo,
    d.num_serie,
    d.marca,
    d.modelo,
    h.id_secuencia AS paso_secuencia,
    ec.nombre_estado,
    h.fecha_cambio,
    ISNULL(h.observacion, 'Sin observacion') AS detalle_evento
FROM DISPOSITIVO d
INNER JOIN HISTORIAL_ESTADOS h 
    ON d.id_dispositivo = h.id_dispositivo
INNER JOIN ESTADO_CATALOGO ec 
    ON h.id_estado = ec.id_estado
WHERE d.id_dispositivo = @id_dispositivo_consulta
ORDER BY h.id_secuencia ASC;
GO

SELECT 
    c.codigo_centro,
    c.nombre_centro,
    ec.nombre_estado AS estado_actual,
    COUNT(d.id_dispositivo) AS cantidad_dispositivos
FROM CENTRO c
INNER JOIN SOLICITUD s 
    ON c.id_centro = s.id_centro
INNER JOIN LOTE l 
    ON s.id_solicitud = l.id_solicitud
INNER JOIN DISPOSITIVO d 
    ON l.id_lote = d.id_lote
INNER JOIN HISTORIAL_ESTADOS he 
    ON d.id_dispositivo = he.id_dispositivo
INNER JOIN ESTADO_CATALOGO ec 
    ON he.id_estado = ec.id_estado
WHERE he.id_secuencia = (
    -- Subconsulta para determinar el ultimo estado del historial del dispositivo
    SELECT MAX(sub_h.id_secuencia)
    FROM HISTORIAL_ESTADOS sub_h
    WHERE sub_h.id_dispositivo = d.id_dispositivo
)
GROUP BY c.codigo_centro, c.nombre_centro, ec.nombre_estado
ORDER BY c.nombre_centro, cantidad_dispositivos DESC;
GO

SELECT 
    cat.nombre_categoria,
    ISNULL(ev.clasificacion_tecnica, 'PENDIENTE DE EVALUAR') AS clasificacion_asignada,
    COUNT(d.id_dispositivo) AS total_dispositivos
FROM CATEGORIA cat
INNER JOIN DISPOSITIVO d 
    ON cat.id_categoria = d.id_categoria
LEFT JOIN EVALUACION_TECNICA ev 
    ON d.id_dispositivo = ev.id_dispositivo
GROUP BY cat.nombre_categoria, ev.clasificacion_tecnica
ORDER BY cat.nombre_categoria, total_dispositivos DESC;
GO

SELECT 
    (SELECT COUNT(*) FROM DISPOSITIVO) AS total_dispositivos_ingresados,
    (SELECT COUNT(*) FROM TRATAMIENTO) AS dispositivos_cerrados,
    CAST(
        ROUND(
            (CAST((SELECT COUNT(*) FROM TRATAMIENTO) AS DECIMAL(8,2)) / 
             CAST((SELECT COUNT(*) FROM DISPOSITIVO) AS DECIMAL(8,2))) * 100.0, 
            2
        ) AS DECIMAL(5,2)
    ) AS porcentaje_trazabilidad_cerrada;
GO

SELECT 
    d.id_dispositivo,
    d.num_serie,
    d.marca,
    d.modelo,
    cat.nombre_categoria,
    l.codigo_lote,
    c.nombre_centro AS centro_recepcion
FROM DISPOSITIVO d
INNER JOIN CATEGORIA cat 
    ON d.id_categoria = cat.id_categoria
INNER JOIN LOTE l 
    ON d.id_lote = l.id_lote
INNER JOIN SOLICITUD s 
    ON l.id_solicitud = s.id_solicitud
INNER JOIN CENTRO c 
    ON s.id_centro = c.id_centro
WHERE NOT EXISTS (
    SELECT 1 
    FROM EVALUACION_TECNICA e 
    WHERE e.id_dispositivo = d.id_dispositivo
)
ORDER BY d.id_dispositivo ASC;
GO