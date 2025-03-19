async function get_datas() {
    let map_interval;
    let hydro_last_val = {};
    let pluvio_last_val = {};

    const freq = 300;
    const initial_radius = 6;

    const start_moment = {
        'm': 1,
        'j': 8,
        'h': 1  
    };

    const end_moment = {
        'm': 1,
        'j': 14,
        'h': 23  
    };

    let current_moment = { ...start_moment };

    const f_cours_eau  = await fetch('data/cours_eau.geojson');
    const cours_eau  = await f_cours_eau.json();

    const f_toulouse  = await fetch('data/commune_toulouse.geojson');
    const toulouse  = await f_toulouse.json();

    const f_chefs_lieux  = await fetch('data/chefs_lieux.geojson');
    const chefs_lieux  = await f_chefs_lieux.json();

    const f_data_hydro  = await fetch('data/data_station_hydro_2022.json');
    const data_hydro = await f_data_hydro.json();

    const f_station_hydro  = await fetch('data/station_hydro_2022.geojson');
    const station_hydro = await f_station_hydro.json();

    const f_data_pluvio  = await fetch('data/data_station_pluvio_2022.json');
    const data_pluvio = await f_data_pluvio.json();

    const f_station_pluvio  = await fetch('data/pluviometre_2022.geojson');
    const station_pluvio = await f_station_pluvio.json();
    

    /*
    console.log(data_hydro);
    console.log(data_pluvio);
    console.log(station_hydro);
    console.log(station_pluvio);
    */

    var fdcarte = new ol.layer.Group({ title: 'Fond de carte', openInLayerSwitcher: false, layers: [
        new ol.layer.Image({
            title:'Orthophotographie',
            visible: false,
            source: new ol.source.ImageWMS({
                url: 'https://data.geopf.fr/wms-r/',
                params: {LAYERS: 'ORTHOIMAGERY.ORTHOPHOTOS', FORMAT:'image/jpeg'}
            }), 
        }),
        new ol.layer.Image({
            title:'Plan IGN',
            visible: false,
            source: new ol.source.ImageWMS({
                url: 'https://data.geopf.fr/wms-r/',
                params: {LAYERS: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', FORMAT:'image/jpeg'}
            }), 
        })
     ]});

     var relief = new ol.layer.Tile({
        title:'Relief',
        opacity:0.3,
        source : new ol.source.WMTS({
            //url: "https://wxs.ign.fr/altimetrie/geoportail/wmts",
            url: 'https://data.geopf.fr/wmts',
            layer: "ELEVATION.SLOPES",
            matrixSet: "PM",
            format: "image/jpeg",
            style: "normal",
            tileGrid : new ol.tilegrid.WMTS({
                origin: [-20037508,20037508], // topLeftCorner
                resolutions: getIgnResolutions(), // résolutions
                matrixIds: ["0","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19"] // ids des TileMatrix
            })
        })
    });



    function cours_eau_style(feature, res) {
        let stroke_w = 2;
        if ( feature.get('toponyme') == 'la Garonne') {
            stroke_w = 4;
        }
        return new ol.style.Style({
            //fill: new ol.style.Fill({color: 'rgba(0,0,200,0.5)'}),
            stroke: new ol.style.Stroke({
                color: [119,166,252], width: stroke_w
            }),
            text: new ol.style.Text({
                font: '12px Calibri,sans-serif',
                text: feature.get('toponyme'),
                placement: 'line',
                fill: new ol.style.Fill({color:[0,0,255]}),
                stroke: new ol.style.Stroke({color:[255,255,255], width:0})
              })
         })

    }

    function chefs_lieux_style(feature, res) {
        return new ol.style.Style({
            image: new ol.style.RegularShape({
                fill: new ol.style.Fill({color: 'rgba(0,0,0,0.5)'}),
                stroke: new ol.style.Stroke({color: [0,0,0], width: 1}),
                points: 4,
                radius: 4,
                angle: Math.PI / 4,
              }),
              text: new ol.style.Text({
                font: '11px Calibri,sans-serif',
                text: feature.get('NOM'),
                textAlign: 'left',
                offsetX:6,
                offsetY:8,
                fill: new ol.style.Fill({color:[0,0,0]}),
                stroke: new ol.style.Stroke({color:[255,255,255], width:0})
              })
        })
    }



    function station_hydro_style(feature, res) {
        const code_station = feature.get('code_station');
        if( code_station == 'O200008001') {
            return;
        }
        let h = 0;
        // console.log(feature.getProperties());
        let obj = data_hydro.find(o => o.cs === feature.get('code_station') && o.m === current_moment['m'] && o.j === current_moment['j'] && o.h === current_moment['h']);
        if( obj === undefined) {
           // console.log('------' + feature.get('code_station') + ' - ' + current_moment['m'] + ' - ' + current_moment['j'] + ' - ' + current_moment['h']);
            h = hydro_last_val[feature.get('code_station')];
        } else {
            hydro_last_val[feature.get('code_station')] = obj.mh;
            h = obj.mh;
        }

        let my_radius = h / 200;

        if ( my_radius < 0 ) my_radius = 1;
        //if ( my_radius > 100 ) my_radius = 100;
        //console.log(my_radius);

        return new ol.style.Style({
            image: new ol.style.Circle({
                radius: my_radius,
                fill: new ol.style.Fill({color: 'rgba(0,0,200,0.5)'}),
                stroke: new ol.style.Stroke({
                    color: [0,0,255], width: 1
                })
            })
        })
    }

    function station_pluvio_style(feature, res) {
        let h = 0;
        let obj = data_pluvio.find(o => o.code_pluviometre === feature.get('code_pluviometre') && o.mois === current_moment['m'] && o.jour === current_moment['j'] );
        if( obj === undefined) {
          //  console.log('------' + feature.get('code_pluviometre') + ' - ' + current_moment['m'] + ' - ' + current_moment['j'] );
            h = pluvio_last_val[feature.get('code_pluviometre')];
        } else {
            pluvio_last_val[feature.get('code_pluviometre')] = obj.prec;
            h = obj.prec;
        }

        let my_radius = 2 + h/5;

        // if ( my_radius < 0 ) my_radius = 1;
        //if ( my_radius > 100 ) my_radius = 100;
        //console.log(my_radius);

        return new ol.style.Style({
            image: new ol.style.Circle({
                radius: my_radius,
                fill: new ol.style.Fill({color: 'rgba(180,180,180,0.7)'}),
                stroke: new ol.style.Stroke({
                    color: [0,0,0], width: 1
                })
            }), text: new ol.style.Text({
                font: '10px Calibri,sans-serif',
                text: h > 80 ? h + 'mm' : '',
                textAlign: 'center',
                offsetX:0,
                offsetY:0,
                fill: new ol.style.Fill({color:[255,0,0]}),
                stroke: new ol.style.Stroke({color:'#fe3', width:2})
              })
        })
    }

    const com_toulouse_src = new ol.source.Vector({
        features: (new ol.format.GeoJSON()).readFeatures(toulouse, { featureProjection: 'EPSG:3857' })
    });

    const com_toulouse = new ol.layer.Vector({
        title:'Commune de Toulouse',
        source: com_toulouse_src,
        style: new ol.style.Style({
            fill: new ol.style.Fill({color: 'rgba(110,77,132,0.2)'}),
            stroke: new ol.style.Stroke({color: [110,77,132], width: 1}),
            text: new ol.style.Text({
                font: '11px Calibri,sans-serif',
                text: 'Toulouse',
                textAlign: 'left',
                offsetX:40,
                offsetY:0,
                fill: new ol.style.Fill({color:[0,0,0]}),
                stroke: new ol.style.Stroke({color:[255,255,255], width:0})
              })
        })
    });

    const cours_eau_src = new ol.source.Vector({
        features: (new ol.format.GeoJSON()).readFeatures(cours_eau, { featureProjection: 'EPSG:3857' })
    });
      
    const cours_eau_lyr = new ol.layer.Vector({
        title:'Cours d \'eau',
        source: cours_eau_src,
        style: cours_eau_style
    });

    const chefs_lieux_src = new ol.source.Vector({
        features: (new ol.format.GeoJSON()).readFeatures(chefs_lieux, { featureProjection: 'EPSG:3857' })
    });
      
    const chefs_lieux_lyr = new ol.layer.Vector({
        title:'Cours d \'eau',
        source: chefs_lieux_src,
        style: chefs_lieux_style
    });


    const station_hydro_src = new ol.source.Vector({
        features: (new ol.format.GeoJSON()).readFeatures(station_hydro, { featureProjection: 'EPSG:3857' })
    });
      
    const station_hydro_lyr = new ol.layer.Vector({
        title:'Stations hydro',
        source: station_hydro_src,
        style: station_hydro_style
    });

    const station_pluvio_src = new ol.source.Vector({
        features: (new ol.format.GeoJSON()).readFeatures(station_pluvio, { featureProjection: 'EPSG:3857' })
    });
      
    const station_pluvio_lyr = new ol.layer.Vector({
        title:'Stations pluvio',
        source: station_pluvio_src,
        style: station_pluvio_style
    });


    let map = new ol.Map({
        controls: ol.control.defaults().extend([
            new ol.control.FullScreen()
        ]),
        target: 'map',
        view: new ol.View({
          zoom: 9.5,
          //center: [43.59,1.43],
          // center: [115742.2,5354235.1],
          center: [139345.6, 5342457.6],
          maxZoom: 15,
          minZoom: 8          
        }),
        layers: [fdcarte, relief, com_toulouse, cours_eau_lyr, chefs_lieux_lyr, station_pluvio_lyr, station_hydro_lyr]
    });

    map.addControl(new ol.control.LayerSwitcher({ trash: false, extent:true, collapsed: true, reordering:false }));
    
    //play_map();

    let serie = get_serie();

    let chart_garonne = draw_chart([serie['serie'][0]], serie['yaxiss'][0], 'chart_garonne');
    let chart_ariege = draw_chart([serie['serie'][1]], serie['yaxiss'][1], 'chart_ariege');
    let chart_salat = draw_chart([serie['serie'][2]], serie['yaxiss'][2], 'chart_salat');
    let chart_leze = draw_chart([serie['serie'][3]], serie['yaxiss'][3], 'chart_leze');

    chart_garonne.update({series:serie['serie'][0]});
    chart_ariege.update({series:serie['serie'][1]});
    chart_salat.update({series:serie['serie'][2]});
    chart_leze.update({series:serie['serie'][3]});

    function play_map() {
        clearInterval(map_interval);
        map_interval = setInterval(function() {
            current_moment = increment(current_moment);
            //console.log(current_moment);
            station_hydro_lyr.setStyle(station_hydro_style);
            station_pluvio_lyr.setStyle(station_pluvio_style);

            let serie = get_serie();
            chart_garonne.update({series:serie['serie'][0]});
            chart_ariege.update({series:serie['serie'][1]});
            chart_salat.update({series:serie['serie'][2]});
            chart_leze.update({series:serie['serie'][3]});
            show_date();
        }, freq)
    }    

    function increment(moment) {
        const new_heure = moment['h'] + 1;
        if ( new_heure > 23 ) {
            moment['h'] = 0;
            moment['j']++;
            if ( moment['j'] > 31) {
                moment['j'] = 1;
                moment['m'] ++;
            }
        } else {
            moment['h'] = new_heure;
        }

        if ( moment['m'] == end_moment['m'] && moment['j'] == end_moment['j'] && moment['h'] == end_moment['h'] ) {
            clearInterval(map_interval);
            moment = { ...start_moment };
        }        
        return moment;
    }

    function show_date() {
        let m = current_moment['m'];
        let j = current_moment['j'];
        if ( m < 10) {
            m = '0' + m;
        }
        if ( j < 10) {
            j = '0' + j;
        }
        let h = current_moment['h'];
        if ( h < 10) {
            h = '0' + h;
        }
        $('#current_date').html('Le ' + j + '/' + m + '/2022' + ' à ' + h + 'h');
    }

    show_date();

    $('#play').on('click', function(){
        play_map();
    });

    $('#stop').on('click', function(){

        clearInterval(map_interval);
        // current_moment ={'m': 1, 'j': 1,'h': 1};
        current_moment = { ...start_moment };
    });
    
    $('#pause').on('click', function(){
        clearInterval(map_interval);
    });


    function get_serie() {
        // --- Charts
        let serie = [
            {name:'La Garonne', data:[], "yAxis": 0, "dataLabels": {"enabled": true }, maxh: 7458}, // 0
            {name:'L\'Ariège', data:[], "yAxis": 0, "dataLabels": {"enabled": true }, maxh: 6230}, // 1
            {name:'Le Salat', data:[], "yAxis": 0, "dataLabels": {"enabled": true }, maxh: 4190}, // 2
            {name:'La Lèze', data:[], "yAxis": 0, "dataLabels": {"enabled": true }, maxh: 6259}, // 3
        ];
        let yaxiss = [];

        for ( let i in station_hydro['features'] ) {
            
            const one_station = station_hydro['features'][i]['properties'];

            
            let  idx = 0;
            let one = {
                name: '',
                data:[]
            };

            if ( one_station['libelle_cours_eau'] == 'L\'Ariège' ) {
                idx = 1;

            } else if ( one_station['libelle_cours_eau'] == 'Le Salat' ) {
                idx = 2;
            } else if ( one_station['libelle_cours_eau'] == 'La Lèze' ) {
                idx = 3;
            }

            serie[idx]['data'].push({
                x: one_station['dist'] ? one_station['dist'] : 0,
                y: get_station_h(one_station['code_station']), //one_station['med_h'],
                name: one_station['libelle_station']
            });
        }
        // Trier selon la distance
        for ( let i in serie ) {
            let newdata = serie[i]['data'].sort((a,b) => b.x - a.x);
            serie[i]['data'] = newdata;
            yaxiss.push({
                min: 0, // Lowest value to show on the yAxis
                max:7500,
                title: {
                    text: undefined
                },
                //offset: 0,
                //height: '100%',
                //top: 50+180*i,
                //tickInterval:500,
                //gridLineWidth:2,
                //gridLineDashStyle:'shortdot',
                labels: {
                    format: '{value}',
                    style:{
                        fontSize: '0.6em',
                    }
                }
                //gridLineColor: colors_cats[tb_rubriques.find(item => item.n == ser.name ).id],
            });
        }

        return {
            serie: serie,
            yaxiss: yaxiss,
        };
    }

function get_station_h(cs){
    let h = 0;
    // console.log(feature.getProperties());
    let obj = data_hydro.find(o => o.cs === cs && o.m === current_moment['m'] && o.j === current_moment['j'] && o.h === current_moment['h']);

    if( obj === undefined) {
       // console.log('------' + feature.get('code_station') + ' - ' + current_moment['m'] + ' - ' + current_moment['j'] + ' - ' + current_moment['h']);
        h = hydro_last_val[cs];
    } else {
        h = obj.mh;
    }
    return h;    
}
    

}

get_datas();

function draw_chart(serie, yaxiss, container) {
    let plotlines = getplotlines(container);
    let title = 'La Garonne';
    if ( container == 'chart_ariege') {
        title = 'L\'Ariège';
    } else if( container == 'chart_salat' ) {
        title = 'Le Salat';
    } else if( container == 'chart_leze' ) {
        title = 'La Lèze';
    }

    return Highcharts.chart(container, {
        chart: {
            type: 'column',
            margin: [40, 10, 60, 80],
            spacing: [0,0,0,0],
            animation: false
            //height: 800
        },
        title: {
            text: title,
            floating:true,
            align: 'left',
            verticalAlign:'bottom',
            x: 80,
            style:{
                fontSize: '0.8em',
            }

        },
        xAxis: [{
            title: {
                text: 'distance entre les stations et Toulouse Pont-Neuf (km)',
            },
            labels: {
                style:{
                    fontSize: '0.6em',
                }
            },
            plotLines: plotlines,
            min:0,
            max: 180,
            //tickmarkPlacement: 'on',
            //categories: annees,
            tickInterval:1,
            gridLineWidth: 1,
            gridLineColor: 'rgba(0,0,0,.3)',
            //gridLineDashStyle: 'longdash',
            //top: '1%',
        }
        ],
        yAxis: {
            min: 0, // Lowest value to show on the yAxis
            max:8000,
            title: {
                text: 'Hauteur d\'eau (mm)',
                style:{
                    fontSize: '0.6em',
                }
            },
            //offset: 0,
            //height: '100%',
            //top: 50+180*i,
            tickInterval:2000,
            //gridLineWidth:2,
            //gridLineDashStyle:'shortdot',
            labels: {
                format: '{value}',
                style:{
                    fontSize: '0.6em',
                }
            }
            //gridLineColor: colors_cats[tb_rubriques.find(item => item.n == ser.name ).id],
        },
        /*yAxis: yaxiss,*/
        legend: {
            enabled: false,
            layout:'vertical',
            align:'right',
            floating: true,
            verticalAlign:'bottom',
            //itemMarginTop: 25,
            //itemMarginBottom: 50,
        },
        /*annotations: [{
            draggable: false,
            crop:false,
            labelOptions: {
                overflow: 'none',
            },
            labels: [{
                text: 'St Gaudens',
                crop:false,
                point: {
                    x: 109,
                    y: 8000,
                    xAxis: 0,
                    yAxis: 0
                },
            },{
                text: 'Portet',
                crop:false,
                point: {
                    x: 9.33,
                    y: 8000,
                    xAxis: 0,
                    yAxis: 0
                },
            }
        ]
        }],*/

        credits: {
            enabled: false,
        },
        tooltip: {
            formatter: function () {
                console.log(this); 
                return `${this.name} à <b>${this.category}</b> km de Toulouse`;
                return this.points.reduce(function (s, point) { 
                    return s + '<br/><span style="color:' + point.color + ';">&#9632</span>&nbsp;' + point.series.name + ': ' +
                        point.y + ' mm';
                }, '<b>' + this.x + '</b>');
            },
            shared: false
        },
        /*responsive: {
            rules: [{
                condition: {
                    maxWidth: 500
                },
                chartOptions: {
                    chart: {
                        height:440,
                    },
                    xAxis:[{
                        top:20,
                    }],
                    legend: {
                        layout: 'horizontal',
                        align: 'center',
                        verticalAlign: 'bottom',
                        margin:10,
                        itemMarginTop: 0,
                        itemMarginBottom: 0,
                    }
                }
            }]
        },*/
        series: serie
    });
}

function getplotlines(container) {
    let plotline_style = {
        fontSize: '0.7em',
        backgroundColor: 'rgba(255,255,0,0.2)',
        //fontWeight: 'bold',
    };

    // Villes
    const datalines = { 
        'chart_garonne' : [
            { text: 'Luchon', value: 175, rotation: -45 },
            { text: 'St-Gaudens', value: 108, rotation: -45 },
            { text: 'Carbonne', value: 45, rotation: -45 },
            { text: 'Muret', value: 21, rotation: -45 },
            { text: 'Portet', value: 9, rotation: -45 },
            { text: 'Pont-Neuf', value: 0, rotation: -45 },
        ], 'chart_ariege' : [
            { text: 'Ax', value: 144, rotation: -45 },
            { text: 'Foix', value: 99, rotation: -45 },
            { text: 'Pamiers', value: 74, rotation: -45 },
            { text: 'Auterive', value: 34, rotation: -45 },
        ], 'chart_salat' : [
            { text: 'St-Girons', value: 114, rotation: -45 },
        ], 'chart_leze' : [
            { text: 'Labarthe', value: 20, rotation: -45 },
            { text: 'Lézat', value: 114, rotation: -45 },
        ]

    }

    let plotlines = [];

    for ( let d in datalines[container]) {
        let data = datalines[container][d];
        plotlines.push({
            color: '#FF0000',
            width: 2,
            value: data['value'],
            zIndex: 3,
            label:{
                useHTML:true,
                text: data['text'],
                rotation: data['rotation'],
                //verticalAlign: 'middle',
                //textAlign: 'right',
                //y: 5,
                x:6,
                y:0,
                style: plotline_style,
            }
        });
    }

    plotline_style = {
        fontSize: '0.7em',
        backgroundColor: 'rgba(119,166,252,0.2)',
        //fontWeight: 'bold',
    };
    // Confluences
    const dataconfl = { 
        'chart_ariege' : [
            { text: 'Garonne', value: 10, rotation: -45 },
            { text: 'Lèze', value: 19, rotation: -45 }
        ], 'chart_salat' : [
            { text: 'Garonne', value: 78, rotation: -45 }
        ], 'chart_leze' : [
            { text: 'Ariège', value: 19, rotation: -45 }
        ]
    }

    for ( let d in dataconfl[container]) {
        let data = dataconfl[container][d];
        plotlines.push({
            color: '#0000ff',
            width: 2,
            value: data['value'],
            dashStyle: 'dash',
            //zIndex: 3,
            label:{
                useHTML:true,
                text: data['text'],
                rotation: data['rotation'],
                //verticalAlign: 'bottom',
                //textAlign: 'right',
                //y: 5,
                x:6,
                y:15,
                style: plotline_style,
            }
        });
    }

    return plotlines;
    
}


function getIgnResolutions() {
    return [
    156543.03392804103,
    78271.5169640205,
    39135.75848201024,
    19567.879241005125,
    9783.939620502562,
    4891.969810251281,
    2445.9849051256406,
    1222.9924525628203,
    611.4962262814101,
    305.74811314070485,
    152.87405657035254,
    76.43702828517625,
    38.218514142588134,
    19.109257071294063,
    9.554628535647034,
    4.777314267823517,
    2.3886571339117584,
    1.1943285669558792,
    0.5971642834779396,
    0.29858214173896974,
    0.14929107086948493,
    0.07464553543474241
    ];
}