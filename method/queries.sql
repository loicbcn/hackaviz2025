-- Crue 2022 - données par station, par heure (valeurs max constatées par heure)
copy(
	WITH hauteurs_medianes as(
		SELECT code_station, median(hauteur) med_h, min(hauteur) min_h, max(hauteur) max_h,  
		FROM read_parquet('C:\donnees\hackaviz\hackaviz2025\data\hauteur_eau_9_crues.parquet')
		WHERE date_part('year', date_heure) = '2022'
		GROUP BY code_station
		ORDER BY code_station
	), datas AS (
		SELECT d.code_station, 
		max(date_part('month', d.date_heure)) mois, max(date_part('day', d.date_heure)) jour, max(date_part('hour', d.date_heure)) heure,
		min(d.hauteur) minh, 
		max(d.hauteur) maxh, 
		max(hm.med_h) med_h,
		(max(d.hauteur) - max(hm.med_h)) ev, count(*) nbmesures
		FROM read_parquet('C:\donnees\hackaviz\hackaviz2025\data\hauteur_eau_9_crues.parquet') d
		INNER JOIN hauteurs_medianes hm ON hm.code_station = d.code_station
		WHERE date_part('year', d.date_heure) = '2022'
		GROUP BY d.code_station, date_part('month', d.date_heure), date_part('day', d.date_heure), date_part('hour', d.date_heure)
		ORDER BY d.code_station, date_part('month', date_heure), date_part('day', d.date_heure), date_part('hour', d.date_heure)
	)
	SELECT code_station cs, mois m, jour j, heure h, maxh mh 
	FROM datas
	ORDER BY code_station, mois, jour, heure, maxh
) TO 'C:\donnees\hackaviz\hackaviz2025\data\data_station_hydro_2022.json' (ARRAY)

--------------------
-- Stations hydro 2022, staions pour lesquelles des mesures de hauteur sont rensignées en 2022 ... 21 stations
copy(
	WITH hauteurs_medianes as(
		SELECT code_station, median(hauteur) med_h, min(hauteur) min_h, max(hauteur) max_h,  
		FROM read_parquet('C:\donnees\hackaviz\hackaviz2025\data\hauteur_eau_9_crues.parquet')
		WHERE date_part('year', date_heure) = '2022'
		GROUP BY code_station
		ORDER BY code_station
	)
	SELECT s.code_station, s.libelle_station, s.libelle_cours_eau, s.altitude_site, s.libelle_commune, hm.med_h, hm.min_h, hm.max_h, st_transform(s.geom,'EPSG:4326','EPSG:3857', true) geom 
	FROM st_read('C:\donnees\hackaviz\hackaviz2025\data\station.geojson') s
	INNER JOIN hauteurs_medianes hm ON hm.code_station = s.code_station --code_station IN(SELECT code_station FROM hauteurs_medianes)
	ORDER BY s.altitude_site DESC
) TO 'C:\UwAmp\www\hackaviz2025\data\station_hydro_2022.geojson' WITH(FORMAT gdal, DRIVER 'GeoJSON', LAYER_CREATION_OPTIONS 'WRITE_BBOX=YES', SRS 'EPSG:3857')


--------------------------------------------
-- Sations pluviométrie 2022
copy(
	SELECT DISTINCT code_pluviometre, nom_usuel, altitude, st_transform(st_point(longitude, latitude), 'EPSG:4326','EPSG:3857') geometry
	FROM read_parquet('C:\donnees\hackaviz\hackaviz2025\data\pluviometrie.parquet') d
	WHERE date_part('year', date_observation) = '2022'
) TO 'C:\UwAmp\www\hackaviz2025\data\pluviometre_2022.geojson' WITH(FORMAT gdal, DRIVER 'GeoJSON', LAYER_CREATION_OPTIONS 'WRITE_BBOX=YES', SRS 'EPSG:3857')