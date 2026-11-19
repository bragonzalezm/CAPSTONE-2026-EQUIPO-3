CREATE TABLE especialista_calendario (
    rut_especialista varchar(10) PRIMARY KEY
        REFERENCES usuario(rut),
    id_calendario_google text NOT NULL UNIQUE,
    CHECK (length(trim(id_calendario_google)) > 0)
);

INSERT INTO especialista_calendario (
    rut_especialista,
    id_calendario_google
)
VALUES (
    '12345679-3',
    'PEGA_AQUI_EL_ID_DEL_CALENDARIO_DE_MARGARITA'
);