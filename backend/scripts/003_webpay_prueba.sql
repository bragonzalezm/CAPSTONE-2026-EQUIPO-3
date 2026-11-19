BEGIN;

CREATE TABLE IF NOT EXISTS webpay_transaccion (
    id_reserva bigint PRIMARY KEY REFERENCES reserva(id_reserva) ON DELETE CASCADE,
    orden varchar(26) NOT NULL UNIQUE,
    sesion varchar(61) NOT NULL,
    huella_token char(64) NOT NULL UNIQUE
);

COMMIT;
