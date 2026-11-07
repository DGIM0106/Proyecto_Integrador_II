USE EcoRAEE_DB;
GO

INSERT INTO ORGANIZACION (ruc, razon_social) VALUES 
('1790012345001', 'Empresa Publica Metropolitana de Gestion Integral'),
('1798823411001', 'Fundacion Ecuatoriana de Reciclaje Electronico'),
('1799234123001', 'Operador Logistico Verde del Ecuador S.A.');

INSERT INTO ROL (nombre_rol) VALUES 
('Administrador del Sistema'),
('Tecnico Clasificador'),
('Coordinador Logistico'),
('Auditor Ambiental');

INSERT INTO USUARIO (nombre, correo, id_organizacion, id_rol) VALUES 
('Anthony Romo', 'anthony.romo@ecoraee.ec', 1, 1),
('Steven Cazar', 'steven.cazar@ecoraee.ec', 1, 2),
('Juan Baez', 'juan.baez@ecoraee.ec', 2, 3),
('Nicolas Velasco', 'nicolas.velasco@ecoraee.ec', 2, 2),
('Daniel Icaza', 'daniel.icaza@ecoraee.ec', 3, 4);

INSERT INTO TIPO_CENTRO (nombre_tipo) VALUES 
('Punto Limpio de Recepcion'),
('Centro de Acopio Intermedio'),
('Planta de Desensamblaje y Tratamiento');

INSERT INTO CENTRO (codigo_centro, nombre_centro, direccion, id_tipo_centro) VALUES 
('CEN-UIO-01', 'Centro de Acopio La Delicia', 'Av. de la Prensa y Galo Plaza Lasso, Quito', 2),
('CEN-UIO-02', 'Punto Limpio Eloy Alfaro', 'Av. Alonso de Angulo y Capitan Chiriboga, Quito', 1),
('CEN-GYE-01', 'Planta de Valorizacion RAEE Guayaquil', 'Km 14.5 Via a Daule, Guayaquil', 3),
('CEN-CUE-01', 'Centro de Transferencia El Arenal', 'Av. de las Americas, Cuenca', 2);

INSERT INTO CATEGORIA (nombre_categoria) VALUES 
('Grandes Electrodomesticos (Linea Blanca)'),
('Equipos de Informatica y Telecomunicaciones'),
('Aparatos Electronicos de Consumo'),
('Herramientas Electricas y Electronicas');

INSERT INTO CONDICION (descripcion_condicion) VALUES 
('Optima / Encendido Correcto'),
('Reparable / Falla Menor'),
('Averiado Critico / No Reparable'),
('Incompleto / Faltan Modulos Clave');

INSERT INTO ESTADO_CATALOGO (nombre_estado) VALUES 
('Recibido en Centro'),
('En Evaluacion Tecnica'),
('Evaluado / Clasificado'),
('En Transferencia Logistica'),
('En Planta de Tratamiento'),
('Cerrado / Trazabilidad Completa');

INSERT INTO SOLICITUD (codigo_solicitud, fecha_solicitud, estado_recoleccion, id_centro) VALUES 
('SOL-2026-001', '2026-10-01 08:30:00', 'Finalizada', 1),
('SOL-2026-002', '2026-10-05 09:15:00', 'Finalizada', 2),
('SOL-2026-003', '2026-10-10 14:00:00', 'En Recoleccion', 3),
('SOL-2026-004', '2026-10-15 11:45:00', 'Asignada', 4);

INSERT INTO LOTE (codigo_lote, fecha_creacion, id_solicitud) VALUES 
('LOT-2026-01', '2026-10-02 09:00:00', 1),
('LOT-2026-02', '2026-10-06 10:30:00', 2),
('LOT-2026-03', '2026-10-12 11:00:00', 3);

INSERT INTO DISPOSITIVO (num_serie, marca, modelo, id_categoria, id_lote) VALUES 
('SN-DELL-001', 'Dell', 'Latitude 5420', 2, 1),
('SN-LEN-002', 'Lenovo', 'ThinkPad T480', 2, 1),
('SN-HP-003', 'HP', 'LaserJet Pro M404n', 2, 1),
('SN-SAM-004', 'Samsung', 'Microondas MS32J', 1, 1),
('SN-APP-005', 'Apple', 'MacBook Air M1', 2, 1),
('SN-SAM-006', 'Samsung', 'Galaxy S21', 2, 1),
('SN-CIS-007', 'Cisco', 'Switch Catalyst 2960', 2, 1),
('SN-LOG-008', 'Logitech', 'Teclado Mecanico MX', 2, 1),
('SN-LG-009', 'LG', 'Monitor UltraWide 29', 3, 1),
('SN-SON-010', 'Sony', 'Smart TV Bravia 55', 3, 1),
('SN-BOS-011', 'Bosch', 'Taladro Percutor GSB 13', 4, 1),
('SN-MAK-012', 'Makita', 'Amoladora Angular 9557', 4, 1),
('SN-WHI-013', 'Whirlpool', 'Refrigeradora No Frost', 1, 1),
('SN-MAB-014', 'Mabe', 'Lavadora Automatica 18kg', 1, 1),
('SN-IND-015', 'Indurama', 'Cocina de Induccion', 1, 2),
('SN-TOS-016', 'Toshiba', 'Disco Externo Canvio 2TB', 2, 2),
('SN-DEL-017', 'Dell', 'Servidor PowerEdge R440', 2, 2),
('SN-LEN-018', 'Lenovo', 'IdeaPad 3 15ITL05', 2, 2),
('SN-HP-019', 'HP', 'All-in-One 24-df0014', 2, 2),
('SN-ACE-020', 'Acer', 'Aspire 5 A515', 2, 2),
('SN-ASU-021', 'Asus', 'Router RT-AX55', 2, 2),
('SN-EFS-022', 'Epson', 'Impresora EcoTank L3250', 2, 2),
('SN-CAN-023', 'Canon', 'Escaner CanoScan LiDE', 2, 2),
('SN-XIA-024', 'Xiaomi', 'Redmi Note 11', 2, 2),
('SN-HUA-025', 'Huawei', 'MateBook D15', 2, 2),
('SN-BRO-026', 'Brother', 'Rotuladora Electronica', 2, 3),
('SN-DLI-027', 'D-Link', 'Switch 8 Puertos DGS-108', 2, 3),
('SN-JBL-028', 'JBL', 'Parlante Charge 5', 3, 3),
('SN-PHI-029', 'Philips', 'Afeitadora Serie 3000', 3, 3),
('SN-PAN-030', 'Panasonic', 'Horno Microondas Inverter', 1, 3);
INSERT INTO EVALUACION_TECNICA (fecha_evaluacion, diagnostico, clasificacion_tecnica, id_dispositivo, id_condicion, id_usuario_evaluador) VALUES 
('2026-10-03 10:00:00', 'Bateria en 94%, disco y RAM funcionales. Apto para donacion.', 'Reutilizacion', 1, 1, 2),
('2026-10-03 11:30:00', 'Teclado dañado y falta pasta termica. Modulo placa madre operativo.', 'Reacondicionamiento', 2, 2, 2),
('2026-10-03 14:00:00', 'Fusor roto, tarjeta logica quemada. Chasis y motores recuperables.', 'Reciclaje', 3, 3, 4),
('2026-10-03 15:45:00', 'Magnetron con fuga y transformador corroído. Material no apto.', 'Disposicion Final', 4, 3, 4),
('2026-10-04 09:30:00', 'Pantalla quebrada, tarjeta principal operativa.', 'Reacondicionamiento', 5, 2, 2),
('2026-10-04 11:00:00', 'Modulo de carga quemado, sin encendido.', 'Reciclaje', 6, 3, 4);
INSERT INTO HISTORIAL_ESTADOS (id_dispositivo, id_secuencia, id_estado, fecha_cambio, observacion) VALUES
(1, 1, 1, '2026-10-02 10:00:00', 'Ingreso al centro de acopio en Lote LOT-2026-01'),
(1, 2, 2, '2026-10-03 09:30:00', 'Asignado al tecnico para chequeo electrico y componentes'),
(1, 3, 3, '2026-10-03 10:30:00', 'Clasificado como Reutilizacion directa para escuelas'),
(1, 4, 4, '2026-10-04 08:00:00', 'Despachado en camion de transporte a centro logistico'),
(1, 5, 5, '2026-10-04 15:00:00', 'Recepcionado en planta de donaciones y empaque'),
(1, 6, 6, '2026-10-05 16:00:00', 'Trazabilidad cerrada. Entregado en programa de inclusion digital'),
(2, 1, 1, '2026-10-02 10:15:00', 'Ingreso por descarte institucional'),
(2, 2, 2, '2026-10-03 11:00:00', 'Inspeccion en mesa de trabajo 2'),
(2, 3, 3, '2026-10-03 11:45:00', 'Clasificado como Reacondicionamiento. Requiere cambio de piezas'),
(2, 4, 4, '2026-10-04 08:00:00', 'Traslado a taller especializado en Guayaquil'),
(2, 5, 5, '2026-10-05 10:00:00', 'Mantenimiento preventivo, teclado nuevo y SSD instalados'),
(2, 6, 6, '2026-10-06 17:30:00', 'Trazabilidad cerrada. Prueba de estres superada al 100%'),
(3, 1, 1, '2026-10-02 10:30:00', 'Recepcion de equipo voluminoso'),
(3, 2, 2, '2026-10-03 13:30:00', 'Revision de mecanismos y componentes electronicos'),
(3, 3, 3, '2026-10-03 14:15:00', 'Clasificado como Reciclaje. Desguace de partes plasticas y cobre'),
(3, 4, 4, '2026-10-04 09:00:00', 'Enviado a planta de trituracion y separacion'),
(3, 5, 5, '2026-10-04 16:30:00', 'Desensamblado manual y separacion de metales pesados'),
(3, 6, 6, '2026-10-06 18:00:00', 'Trazabilidad cerrada. Material pesado entregado a fundicion'),
(4, 1, 1, '2026-10-02 10:45:00', 'Recepcion linea blanca averiada'),
(4, 2, 2, '2026-10-03 15:00:00', 'Medicion de continuidad y aislamiento'),
(4, 3, 3, '2026-10-03 16:00:00', 'Clasificado como Disposicion Final. Foco de peligro por corrosión'),
(4, 4, 4, '2026-10-04 09:00:00', 'Traslado con protocolo de residuos peligrosos'),
(4, 5, 5, '2026-10-05 11:30:00', 'Neutralizacion y sellado hermetico en fosa de seguridad'),
(4, 6, 6, '2026-10-07 12:00:00', 'Trazabilidad cerrada. Acta de destruccion emitida'),
(5, 1, 1, '2026-10-02 11:00:00', 'Recibido en centro'),
(5, 2, 2, '2026-10-04 09:00:00', 'En diagnostico'),
(6, 1, 1, '2026-10-02 11:15:00', 'Recibido en centro'),
(7, 1, 1, '2026-10-02 11:30:00', 'Recibido en centro'),
(8, 1, 1, '2026-10-02 11:45:00', 'Recibido en centro');
INSERT INTO TRANSFERENCIA_MOVIMIENTO (fecha_movimiento, estado_transferencia, id_centro_origen, id_centro_destino, id_dispositivo) VALUES 
('2026-10-04 08:30:00', 'Entregado', 1, 3, 1),
('2026-10-04 08:30:00', 'Entregado', 1, 3, 2),
('2026-10-04 09:15:00', 'Entregado', 1, 3, 3),
('2026-10-04 09:15:00', 'Entregado', 1, 3, 4),
('2026-10-14 10:00:00', 'En Transito', 2, 3, 5);
INSERT INTO TRATAMIENTO (resultado, destino, fecha_cierre, id_dispositivo) VALUES 
('Donacion Educativa Operativa', 'Colegio Tecnico San Jose de Quito', '2026-10-05 16:00:00', 1),
('Reacondicionamiento Certificado', 'Laboratorio de Innovacion UIDE', '2026-10-06 17:30:00', 2),
('Despiece y Recuperacion de Cobre/Plastico', 'Planta Metalurgica Nacional', '2026-10-06 18:00:00', 3),
('Confinamiento en Relleno de Seguridad', 'Celda Especial de Residuos Peligrosos Inga', '2026-10-07 12:00:00', 4);
INSERT INTO EVIDENCIA (tipo_archivo, url_archivo, id_tratamiento) VALUES 
('PDF', 'https://s3.amazonaws.com/ecoraee-cloud/actas/acta_entrega_001.pdf', 1),
('JPG', 'https://s3.amazonaws.com/ecoraee-cloud/fotos/laptop_reacondicionada_002.jpg', 2),
('PDF', 'https://s3.amazonaws.com/ecoraee-cloud/manifiestos/manifiesto_reciclaje_003.pdf', 3),
('PDF', 'https://s3.amazonaws.com/ecoraee-cloud/certificados/cert_destruccion_004.pdf', 4);
INSERT INTO INVENTARIO (stock_actual, fecha_actualizacion, id_centro, id_categoria) VALUES 
(18, '2026-10-20 18:00:00', 1, 2),
(6,  '2026-10-20 18:00:00', 1, 1),
(12, '2026-10-20 18:00:00', 2, 2),
(4,  '2026-10-20 18:00:00', 2, 3),
(45, '2026-10-20 18:00:00', 3, 2),
(22, '2026-10-20 18:00:00', 3, 1);
INSERT INTO NODO (tipo_nodo, capacidad_nodo) VALUES 
('Punto Recoleccion Norte', 15.50),
('Planta de Procesamiento Central', 80.00),
('Vertedero Especializado Sur', 120.00);
INSERT INTO ARISTA (distancia_km, tiempo_estimado_min, id_nodo_origen, id_nodo_destino) VALUES 
(24.50, 45, 1, 2),
(38.20, 65, 2, 3),
(55.10, 95, 1, 3);
INSERT INTO ESCENARIO (codigo_escenario, resultado) VALUES 
('ESC-2026-RUTAS-MIN', 'Ruta optima minimiza costo de transporte en un 18.4%'),
('ESC-2026-CO2-NEUTRAL', 'Disminucion de 4.2 toneladas de CO2 mediante centros intermedios');
INSERT INTO INDICADOR (nombre_indicador, valor_meta, valor_actual, periodo, id_escenario) VALUES 
('Tasa de Recuperacion de Componentes', 75.00, 81.50, '2026-Q3', 1),
('Tiempo Promedio de Cierre de Trazabilidad (Dias)', 7.00, 5.20, '2026-Q3', 1),
('Reduccion Emisiones de Carbono Transporte', 15.00, 18.40, '2026-Q3', 2);
INSERT INTO ALERTA (fecha_generacion, nivel_criticidad, mensaje, estado_alerta, id_centro) VALUES 
('2026-10-18 09:20:00', 'Alta', 'Capacidad de almacenamiento en La Delicia supero el 85%', 'Activa', 1),
('2026-10-19 14:10:00', 'Media', 'Lote de monitores CRT excede tiempo limite de permanencia sin evaluar', 'En Atencion', 2);
INSERT INTO AUDITORIA (fecha_accion, tabla_afectada, tipo_operacion, detalle, id_usuario) VALUES 
('2026-10-02 09:00:00', 'LOTE', 'INSERT', 'Creacion de lote inicial LOT-2026-01 con 14 dispositivos', 1),
('2026-10-03 10:00:00', 'EVALUACION_TECNICA', 'INSERT', 'Registro de evaluacion tecnica para equipo SN-DELL-001', 2),
('2026-10-05 16:00:00', 'TRATAMIENTO', 'INSERT', 'Cierre y emision de acta para dispositivo id 1', 1);
GO