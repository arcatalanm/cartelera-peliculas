CREATE DATABASE IF NOT EXISTS cartelera_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cartelera_db;

-- Tabla padre: Generos
CREATE TABLE Generos (
    id_genero INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

-- Tabla hija: Peliculas
CREATE TABLE Peliculas (
    id_pelicula INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    director VARCHAR(150),
    anio_estreno INT,
    duracion INT,
    clasificacion VARCHAR(10),
    sinopsis VARCHAR(300),
    descripcion_completa TEXT,
    en_cartelera BOOLEAN DEFAULT TRUE,
    portada_url VARCHAR(500),
    id_genero INT NOT NULL,
    CONSTRAINT fk_pelicula_genero FOREIGN KEY (id_genero) REFERENCES Generos(id_genero)
);

-- Datos semilla: Géneros extendidos
INSERT INTO Generos (nombre) VALUES 
('Acción'),            -- id_genero: 1
('Ciencia Ficción'),   -- id_genero: 2
('Drama'),             -- id_genero: 3
('Terror'),            -- id_genero: 4
('Bélica'),            -- id_genero: 5
('Aventura'),          -- id_genero: 6
('Suspenso'),          -- id_genero: 7
('Biografía');         -- id_genero: 8

-- La columna portada_url guarda la URL pública completa del objeto en S3.
-- Ejemplo: https://s3-cinego-acm.s3.us-east-1.amazonaws.com/portadas/oppenheimer.webp
-- Reemplaza s3-cinego-acm por el nombre real de tu bucket antes de ejecutar el script.

-- Datos semilla: Películas solicitadas
INSERT INTO Peliculas (
    titulo, 
    director, 
    anio_estreno, 
    duracion, 
    clasificacion, 
    sinopsis, 
    descripcion_completa, 
    en_cartelera, 
    portada_url, 
    id_genero
) VALUES 
(
    'Oppenheimer', 
    'Christopher Nolan', 
    2023, 
    180, 
    '+14', 
    'La historia del físico estadounidense J. Robert Oppenheimer y su papel en el desarrollo de la bomba atómica.', 
    'Durante la Segunda Guerra Mundial, el teniente general Leslie Groves Jr. designa al físico J. Robert Oppenheimer para liderar el Proyecto Manhattan, un programa secreto cuyo objetivo consiste en diseñar y construir las primeras armas nucleares de la historia, cambiando para siempre el curso de la humanidad.', 
    TRUE, 
    'https://s3-cinego-acm.s3.us-east-1.amazonaws.com/media/oppenheimer.webp', 
    8
),
(
    'Interestelar', 
    'Christopher Nolan', 
    2014, 
    169, 
    'TE+7', 
    'Un equipo de exploradores viaja a través de un agujero de gusano en el espacio en un intento por asegurar la supervivencia de la humanidad.', 
    'Con la Tierra volviéndose inhabitable en el futuro debido a plagas y tormentas de polvo, un grupo de astronautas liderados por el expiloto Joseph Cooper atraviesa un agujero de gusano cerca de Saturno en busca de un nuevo planeta habitable para la raza humana.', 
    TRUE, 
    'https://s3-cinego-acm.s3.us-east-1.amazonaws.com/media/interestelar.webp', 
    2
),
(
    'Avengers: Endgame', 
    'Anthony y Joe Russo', 
    2019, 
    181, 
    'TE+7', 
    'Los Vengadores restantes se reúnen una vez más para revertir las acciones de Thanos y restaurar el equilibrio del universo.', 
    'Después de los devastadores eventos ocurridos en Infinity War, el universo está en ruinas. Con la ayuda de los aliados que quedaron, los Vengadores se embarcan en una misión a través del tiempo para recuperar las Gemas del Infinito y deshacer el chasquido de Thanos.', 
    TRUE, 
    'https://s3-cinego-acm.s3.us-east-1.amazonaws.com/media/endgame.webp', 
    1
),
(
    'Spider-Man: No Way Home', 
    'Jon Watts', 
    2021, 
    148, 
    'TE+7', 
    'Con la identidad de Spider-Man ahora revelada, Peter Parker pide ayuda al Doctor Strange, desatando una crisis en el multiverso.', 
    'Por primera vez en la historia cinematográfica de Spider-Man, nuestro héroe vecino es desenmascarado y ya no puede separar su vida normal de los altos riesgos de ser un superhéroe. Cuando pide ayuda a Doctor Strange, un hechizo fallido abre la puerta a peligrosos villanos de otros universos.', 
    TRUE, 
    'https://s3-cinego-acm.s3.us-east-1.amazonaws.com/media/no way home.webp', 
    6
),
(
    'Batman: El Caballero de la Noche', 
    'Christopher Nolan', 
    2008, 
    152, 
    '+14', 
    'Batman enfrenta su mayor prueba psicológica y física cuando una mente criminal conocida como el Joker sume a Ciudad Gótica en el caos.', 
    'Con la ayuda del teniente Jim Gordon y del fiscal de distrito Harvey Dent, Batman se propone desmantelar las organizaciones criminales restantes que plagan las calles de Gotham. La asociación demuestra ser eficaz, pero pronto se ven presa de un reinado de caos desatado por el Joker.', 
    TRUE, 
    'https://s3-cinego-acm.s3.us-east-1.amazonaws.com/media/batman.webp', 
    1
),
(
    'Hasta el Último Hombre', 
    'Mel Gibson', 
    2016, 
    139, 
    '+14', 
    'La historia real de Desmond Doss, médico del ejército estadounidense que salvó a 75 hombres en Okinawa sin disparar una sola bala.', 
    'Ambientada en la Segunda Guerra Mundial, narra la extraordinaria historia del objetor de conciencia Desmond Doss, quien en la sangrienta batalla de Okinawa se negó a portar o disparar un arma por sus convicciones, logrando evacuar él solo a decenas de soldados heridos bajo fuego enemigo.', 
    TRUE, 
    'https://s3-cinego-acm.s3.us-east-1.amazonaws.com/media/hacksaw ridge.webp', 
    5
),
(
    'Rescatando al Soldado Ryan', 
    'Steven Spielberg', 
    1998, 
    169, 
    '+14', 
    'Tras el desembarco de Normandía, un grupo de soldados estadounidenses se adentra tras las líneas enemigas para rescatar a un paracaidista.', 
    'Durante la invasión de Normandía en la Segunda Guerra Mundial, el capitán John Miller recibe la orden de liderar un escuadrón detrás de las líneas alemanas para encontrar y traer de vuelta a casa al soldado James Ryan, cuyos tres hermanos han muerto en combate.', 
    TRUE, 
    'https://s3-cinego-acm.s3.us-east-1.amazonaws.com/media/saving private ryan.webp', 
    5
),
(
    'It (Eso)', 
    'Andy Muschietti', 
    2017, 
    135, 
    '+14', 
    'En el pueblo de Derry, un grupo de niños marginados se enfrenta a sus mayores miedos cuando un ente maligno toma la forma del payaso Pennywise.', 
    'Cuando comienzan a desaparecer niños en la ciudad de Derry, Maine, un grupo de jóvenes amigos conocido como el Club de los Perdedores se ve obligado a enfrentar sus mayores temores al cruzarse con Pennywise, un payaso malvado cuya historia de asesinatos y violencia data de siglos atrás.', 
    TRUE, 
    'https://s3-cinego-acm.s3.us-east-1.amazonaws.com/media/it.webp', 
    4
);