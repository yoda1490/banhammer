var map;
var layerControl;
var layerGroups= new Object();
var colorizedCountryLayer;

var stats;

//used to determine color scale
var maxPerCountry=0;
var countryCounter=0;

var markersArray=[];
function clearOverlays() {
    colorizedCountryLayer.clearLayers();
    for(var l in layerGroups){
        layerGroups[l].clearLayers();
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
        for(let i in countryCounter){
          if(countryCounter[i].count>maxPerCountry)maxPerCountry=countryCounter[i].count;
        };

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

    if(typeof(layerGroups[layerName]) == 'undefined'){
    	layerGroups[layerName] = L.layerGroup();
        layerGroups[layerName].addTo(map);
        layerControl.addOverlay(layerGroups[layerName], layerName);
    }

    layerGroups[layerName].addLayer(marker);

}


function getColor(d) {
    if(typeof(countryCounter[d]) != 'undefined'){
      d=countryCounter[d].count;
    }else{
      d=0;
    }
    
    return d > maxPerCountry*80/100 ? '#800026' :
           d > maxPerCountry*50/100  ? '#BD0026' :
           d > maxPerCountry*30/100  ? '#E31A1C' :
           d > maxPerCountry*20 /100 ? '#FC4E2A' :
           d > maxPerCountry*10/100   ? '#FD8D3C' :
           d > maxPerCountry*6/100   ? '#FEB24C' :
           d > maxPerCountry*2/100   ? '#FED976' :
                      '#FFEDA0';
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
});


