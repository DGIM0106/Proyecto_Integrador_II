USE EcoRAEE_DB;
GO
PRINT '--- PRUEBA 1 ---';
BEGIN TRY
    SET IDENTITY_INSERT ROL ON;
    INSERT INTO ROL (id_rol, nombre_rol) VALUES (1, 'Rol Duplicado Ilegal');
    SET IDENTITY_INSERT ROL OFF;
    PRINT 'ERROR: La prueba fallo, se inserto una PK repetida.';
END TRY
BEGIN CATCH
    IF @@OPTIONS & 1 = 1 SET IDENTITY_INSERT ROL OFF;
    PRINT 'RECHAZO CORRECTO: ' + ERROR_MESSAGE();
END CATCH;
GO

PRINT '--- PRUEBA 2 ---';
BEGIN TRY
    INSERT INTO DISPOSITIVO (num_serie, marca, modelo, id_categoria, id_lote)
    VALUES ('SN-FAIL-FK', 'Generico', 'Inexistente', 9999, 1);
    PRINT 'ERROR: La prueba fallo, se permitio una FK inexistente.';
END TRY
BEGIN CATCH
    PRINT 'RECHAZO CORRECTO: ' + ERROR_MESSAGE();
END CATCH;
GO

PRINT '--- PRUEBA 3 ---';
BEGIN TRY
    INSERT INTO DISPOSITIVO (num_serie, marca, modelo, id_categoria, id_lote)
    VALUES ('SN-DELL-001', 'Dell Clonado', 'Latitude 5420', 2, 1);
    PRINT 'ERROR: La prueba fallo, se permitio duplicar una clave alterna UNIQUE.';
END TRY
BEGIN CATCH
    PRINT 'RECHAZO CORRECTO: ' + ERROR_MESSAGE();
END CATCH;
GO

PRINT '--- PRUEBA 4 ---';
BEGIN TRY
    INSERT INTO EVALUACION_TECNICA (fecha_evaluacion, diagnostico, clasificacion_tecnica, id_dispositivo, id_condicion, id_usuario_evaluador)
    VALUES (SYSUTCDATETIME(), 'Diagnostico con valor inventado', 'Venta Ambulante Ilegal', 7, 1, 2);
    PRINT 'ERROR: La prueba fallo, se permitio un valor no contemplado en el CHECK.';
END TRY
BEGIN CATCH
    PRINT 'RECHAZO CORRECTO: ' + ERROR_MESSAGE();
END CATCH;
GO

PRINT '--- PRUEBA 5 ---';
BEGIN TRY
    DELETE FROM CATEGORIA WHERE id_categoria = 2;
    PRINT 'ERROR: La prueba fallo, se borro un registro padre con dependencias activas.';
END TRY
BEGIN CATCH
    PRINT 'RECHAZO CORRECTO: ' + ERROR_MESSAGE();
END CATCH;
GO