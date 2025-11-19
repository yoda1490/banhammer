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
var isLoading = false;

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

function showLoader() {
    if (!isLoading) {
        isLoading = true;
        $('#map').append('<div id="map-loader" class="loader-overlay"><div class="loader-spinner"></div><div class="loader-text">Loading data...</div></div>');
    }
}

function hideLoader() {
    isLoading = false;
    $('#map-loader').fadeOut(300, function() {
        $(this).remove();
    });
}

function updatex() {
    clearOverlays();
    loadmarkers();
}

function loadmarkers() {
    showLoader();
    
    // Charger les stats d'abord (plus rapide)
    $.getJSON("get.php?action=stats", function(data) {
        stats=data;
	$('.stat ol').empty();
        
        // Optimisation: construire le HTML en une seule fois au lieu de multiples append
        var top5Html = '';
        var last5Html = '';
        var lastipsHtml = '';
        var protosHtml = '';
        
        for(var i = 0; i < data['totals'].length; i++) {
            var j = data['totals'][i];
            top5Html += "<li><img src='images/flags/" + j.code + ".png' alt='" + j.code + "' /> " + j.country + " (" + j.count + ")</li>";
        }
        
        for(var i = 0; i < data['last'].length; i++) {
            var j = data['last'][i];
            last5Html += "<li title='" + j.timestamp + "'><img src='images/flags/" + j.code + ".png' alt='" + j.code + "' /> " + j.country + "</li>";
        }
        
        for(var i = 0; i < data['lastips'].length; i++) {
            var j = data['lastips'][i];
            lastipsHtml += "<li title='" + j.country + " - " + j.timestamp + "'><img src='images/flags/" + j.code + ".png' alt='" + j.code + "' /> " + j.timestamp.split(' ')[1] + " <a href='#' onclick='whois(\"" + j.id + "\");return false;'>" + j.ip + "</a></li>";
        }
        
        for(var i = 0; i < data['protos'].length; i++) {
            var j = data['protos'][i];
            protosHtml += "<li>" + j.name + " (" + j.count + ")</li>";
        }
        
        $("#top5").html(top5Html);
        $("#last5").html(last5Html);
        $("#lastips").html(lastipsHtml);
        $("#protocols").html(protosHtml);

        countryCounter=data['totalpercountry'];
        
        // Calculate color thresholds based on actual country counts
        var countryCounts = [];
        for(let i in countryCounter){
          countryCounts.push(countryCounter[i].count);
          if(countryCounter[i].count>maxPerCountry)maxPerCountry=countryCounter[i].count;
        }
        
        // Sort counts in descending order
        countryCounts.sort(function(a, b){return b - a});
        
        // Distribution optimisée basée sur les données réelles:
        // Top 5: >8500, Top 10: >5000, etc.
        if(countryCounts.length >= 5){
          colorThresholds = [
            countryCounts[4],      // Top 5 (>8000) - Très rouge foncé
            1000,                   // >1000 bans - Rouge foncé
            500,                    // >500 bans - Rouge
            200,                    // >200 bans - Orange-rouge
            100,                    // >100 bans - Orange
            50,                     // >50 bans - Orange clair
            20,                     // >20 bans - Jaune
            1                       // >=1 ban - Jaune très clair
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
        
        // Charger les markers après les stats pour éviter le blocage
        $.getJSON("get.php?action=markers", function(markerData) {
            for (var i in markerData) {
                createMarker(markerData[i]);
            }
            hideLoader();
        }).fail(function() {
            hideLoader();
        });

    }).fail(function() {
        hideLoader();
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
    
    // Distribution optimisée avec des seuils réels
    return d >= colorThresholds[0] ? '#800026' :  // Top 5 (>8500) - Très rouge foncé
           d >= colorThresholds[1] ? '#BD0026' :  // >1000 bans - Rouge foncé
           d >= colorThresholds[2] ? '#E31A1C' :  // >500 bans - Rouge
           d >= colorThresholds[3] ? '#FC4E2A' :  // >200 bans - Orange-rouge
           d >= colorThresholds[4] ? '#FD8D3C' :  // >100 bans - Orange
           d >= colorThresholds[5] ? '#FEB24C' :  // >50 bans - Orange clair
           d >= colorThresholds[6] ? '#FED976' :  // >20 bans - Jaune
           d >= colorThresholds[7] ? '#FFEDA0' :  // >=1 ban - Jaune très clair
                      '#FFFFFF';                   // No bans - Blanc
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
            worldCopyJump: false, // prevent world repetition
            noWrap: true,         // prevent world repetition
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


