var map;
var layerControl;
var layerGroups= new Object();
var markerClusters= new Object();
var colorizedCountryLayer;

var stats;

//used to determine color scale
var maxPerCountry=0;
var countryCounter=0;
var colorThresholds=[];

var markersArray=[];
function clearOverlays() {
    colorizedCountryLayer.clearLayers();
    for(var l in layerGroups){
        layerGroups[l].clearLayers();
    };
    for(var c in markerClusters){
        markerClusters[c].clearLayers();
    };
        
}

function updatex() {
    clearOverlays();
    loadmarkers();
}

function loadmarkers() {
    $.getJSON("get.php?action=markers", function(data) {
        for (var i in data) {
            createMarker(data[i]);
        }
    });
    $.getJSON("get.php?action=stats", function(data) {
        stats=data;
	$('.stat ol').empty();
        $(data['totals']).each(function(i,j) {
            $("#top5").append("<li><img src=\"images/flags/" + j.code + ".png\" alt=\"" + j.code + "\" /> " + j.country + " (" + j.count + ")" + "</li>");
        });

        $(data['last']).each(function(i,j) {
            $("#last5").append("<li title=\""+j.timestamp+"\"><img src=\"images/flags/" + j.code + ".png\" alt=\"" + j.code + "\" /> " + j.country + "</li>");
        });

        $(data['lastips']).each(function(i,j) {
            $("#lastips").append("<li title=\""+j.country+" - "+j.timestamp+"\"><img src=\"images/flags/" + j.code + ".png\" alt=\"" + j.code + "\" /> " + j.timestamp.split(' ')[1] + ' <a href="#" onclick="whois(\''+j.id+'\');return false;">' + j.ip + "</a></li>");
        });

        $(data['protos']).each(function(i,j) {
            $("#protocols").append("<li>" + j.name + " (" + j.count + ")</li>");
        });

        countryCounter=data['totalpercountry'];
        
        // Calculate color thresholds based on actual country counts
        var countryCounts = [];
        for(let i in countryCounter){
          countryCounts.push(countryCounter[i].count);
          if(countryCounter[i].count>maxPerCountry)maxPerCountry=countryCounter[i].count;
        };
        
        // Sort counts in descending order
        countryCounts.sort(function(a, b){return b - a});
        
        // Define thresholds to ensure top 5 countries get darkest color
        // and better distribution across the rest
        if(countryCounts.length >= 5){
          colorThresholds = [
            countryCounts[4],      // Top 5 (darkest)
            countryCounts[Math.min(10, countryCounts.length-1)],  // Top 6-10
            countryCounts[Math.min(20, countryCounts.length-1)],  // Top 11-20
            countryCounts[Math.min(35, countryCounts.length-1)],  // Top 21-35
            countryCounts[Math.min(50, countryCounts.length-1)],  // Top 36-50
            countryCounts[Math.min(75, countryCounts.length-1)],  // Top 51-75
            countryCounts[Math.min(100, countryCounts.length-1)], // Top 76-100
            1  // Any country with at least 1 ban
          ];
        }else{
          // Fallback for fewer countries
          colorThresholds = [
            maxPerCountry * 0.8,
            maxPerCountry * 0.5,
            maxPerCountry * 0.3,
            maxPerCountry * 0.2,
            maxPerCountry * 0.1,
            maxPerCountry * 0.05,
            maxPerCountry * 0.01,
            1
          ];
        }

        $("#ipsblocked").html(" " + data['totalip'][0].count);
        $("#ipsban").html(" " + data['ipban'][0].count);
        $("#countriesclocked").html(" " + data['totalcountry'][0].count);

        if(typeof(colorizedCountryLayer) == 'undefined'){
            colorizedCountryLayer=L.geoJson(countryData, {style: style});
            colorizedCountryLayer.addTo(map);
            layerControl.addOverlay(colorizedCountryLayer, "Country colorization");
        }else{
            colorizedCountryLayer.addData(countryData, {style: style});
        }

    });


}

function createMarker(data) {

    
    color='red';
    letter='U';

    layerName=data.name;

    if(data.ban == 0){
        color='paleblue';
        layerName=layerName+' released'
    }

    if (data.name.match(/ssh/)) {
        letter = 'S';
    }else if (data.name.match(/apache/)) {
        letter = 'A';
    }else if (data.name.match(/postfix/)) {
        letter = 'P';
    }else if (data.name.match(/sasl/)) {
        letter = 'S';
    }

    iname = "images/markers/"+color+"_Marker"+letter+".png";

    var icon = L.icon({
        iconUrl: iname,
        iconAnchor: [10, 34]
    });


    var html = "<b>" + data.name + " " + "</b><br />" + data.country + ", "+data.city+" <br/>";
    $.each(data.ips.split(','), function(i,j){
        html+='<a href="#" onclick="whois(\''+j.split(':')[0]+'\');return false;">'+j.split(':')[1]+'</a><br/>';
    });
    var marker=L.marker({lon: data.longitude, lat: data.latitude}, {icon: icon}).bindPopup(html);

    // Create cluster group if it doesn't exist
    if(typeof(markerClusters[layerName]) == 'undefined'){
        markerClusters[layerName] = L.markerClusterGroup({
            showCoverageOnHover: true,
            zoomToBoundsOnClick: true,
            spiderfyOnMaxZoom: true,
            removeOutsideVisibleBounds: true,
            iconCreateFunction: function(cluster) {
                var childCount = cluster.getChildCount();
                var c = ' marker-cluster-';
                if (childCount < 10) {
                    c += 'small';
                } else if (childCount < 100) {
                    c += 'medium';
                } else {
                    c += 'large';
                }
                return new L.DivIcon({ 
                    html: '<div><span>' + childCount + '</span></div>', 
                    className: 'marker-cluster' + c, 
                    iconSize: new L.Point(40, 40) 
                });
            }
        });
        markerClusters[layerName].addTo(map);
        layerControl.addOverlay(markerClusters[layerName], layerName);
    }

    markerClusters[layerName].addLayer(marker);

}


function getColor(d) {
    if(typeof(countryCounter[d]) != 'undefined'){
      d=countryCounter[d].count;
    }else{
      d=0;
    }
    
    // Use calculated thresholds for better distribution
    return d >= colorThresholds[0] ? '#800026' :  // Top 5 - Very dark red
           d >= colorThresholds[1] ? '#BD0026' :  // Top 6-10 - Dark red
           d >= colorThresholds[2] ? '#E31A1C' :  // Top 11-20 - Red
           d >= colorThresholds[3] ? '#FC4E2A' :  // Top 21-35 - Orange-red
           d >= colorThresholds[4] ? '#FD8D3C' :  // Top 36-50 - Orange
           d >= colorThresholds[5] ? '#FEB24C' :  // Top 51-75 - Light orange
           d >= colorThresholds[6] ? '#FED976' :  // Top 76-100 - Yellow
           d >= colorThresholds[7] ? '#FFEDA0' :  // Rest with at least 1 ban - Light yellow
                      '#FFFFFF';                   // No bans - White
}

function style(feature) {

    return {
        fillColor: getColor(feature.id),
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    };
}


//give an id in the table and retourne the ip whois corresponding
function whois(id){
    $.getJSON("get.php?action=whois&ip="+id, function(data) {
        $('#whois .modal-body').html(data.whois);
        $('#whois .modal-title').html(data.ip)
        $('#whois').modal('show');
    });
}

var map;

$(document).ready(function() {
   map = L.map('map', {
        center: [0, 0],
        zoom: 2
    });

    	
	

    // add the OpenStreetMap tiles
    osm=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 2,
      worldCopyJump: true,
      noWrap: false,
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    })

    map.addLayer(osm);
    

    //show the box to controll layer
    layerControl = L.control.layers(null, null, {position: 'topleft'});
    //add default map
    layerControl.addBaseLayer(osm, "OSM default")

    // show the scale bar on the lower left corner
    L.control.scale().addTo(map);
    

    loadmarkers();

    
    layerControl.addTo(map);

    var myVar = setInterval(function() {
        updatex();
    }, 1000 * 60 * 5);

    // Panel toggle functionality
    $('#toggle-left').on('click', function() {
        $('#last_menu').toggleClass('hidden');
        $(this).toggleClass('collapsed');
        $(this).html($(this).hasClass('collapsed') ? '▶' : '◀');
    });

    $('#toggle-right').on('click', function() {
        $('#stats_menu').toggleClass('hidden');
        $(this).toggleClass('collapsed');
        $(this).html($(this).hasClass('collapsed') ? '◀' : '▶');
    });
});


