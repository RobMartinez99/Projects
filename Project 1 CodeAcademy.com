CREATE TABLE friends (
  id INTEGER,
  name TEXT,
  birthday DATE
);

INSERT INTO friends (id,name,birthday)
VALUES (1,'Ororo Munroe','1940-05-30');

INSERT INTO friends (id,name,birthday)
VALUES (2,'Andy Martinez','1986-07-26');

INSERT INTO friends (id,name,birthday)
VALUES (3,'George Corton', '1979-11-02');

SELECT*FROM friends;

UPDATE friends
SET name= 'Storm'
WHERE id=1;

ALTER TABLE friends
ADD COLUMN email TEXT;


UPDATE friends
SET email = 'storm@codeacademy.com'
WHERE id = 1;

UPDATE friends
SET email='andymoose08@gmail.com'
WHERE id = 2;

UPDATE friends
Set email='gcorton79@gmail.com'
WHERE id = 3;

DELETE FROM friends
WHERE id=1;

SELECT*FROM friends;















