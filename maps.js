var map;

var stats;

//used to determine color scale
var maxPerCountry=0;
var countryCounter=0;

var markersArray=[];
function clearOverlays() {
    for (var i = 0; i < markersArray.length; i++) {
        markersArray[i].setMap(null);
    }
    markersArray.length = 0;
}

function updatex() {
    clearOverlays();
    loadmarkers();
}

function loadmarkers() {
    $.getJSON("getmarkers.php", function(data) {
        for (var i in data) {
            createMarker(data[i]);
        }
    });

    $.getJSON("getstats.php", function(data) {
        stats=data;
	$('.stat ol').empty();
        $(data['totals']).each(function(i,j) {
            $("#top5").append("<li><img src=\"images/flags/" + j.code + ".png\" alt=\"" + j.code + "\" /> " + j.country + " (" + j.count + ")" + "</li>");
        });

        $(data['last']).each(function(i,j) {
            $("#last5").append("<li title=\""+j.timestamp+"\"><img src=\"images/flags/" + j.code + ".png\" alt=\"" + j.code + "\" /> " + j.country + "</li>");
        });

        $(data['lastips']).each(function(i,j) {
            $("#lastips").append("<li title=\""+j.country+"\"><img src=\"images/flags/" + j.code + ".png\" alt=\"" + j.code + "\" /> " + j.timestamp.split(' ')[1] + ' ' + j.ip + "</li>");
        });

        $(data['protos']).each(function(i,j) {
            $("#protocols").append("<li>" + j.name + " (" + j.count + ")</li>");
        });

        countryCounter=data['totalpercountry'];
        for(let i in countryCounter){
          if(countryCounter[i].count>maxPerCountry)maxPerCountry=countryCounter[i].count;
        };

        $("#ipsblocked").html(" " + data['totalip'][0].count);
        $("#countriesclocked").html(" " + data['totalcountry'][0].count);

        L.geoJson(countryData, {style: style}).addTo(map);

    });


}

function createMarker(data) {

    
    color='red';
    letter='U';

    if(data.ban == 0) color='paleblue';

    if (data.name.match(/ssh/)) {
        letter = 'S';
    }else if (data.name.match(/apache/)) {
        letter = 'A';
    }else if (data.name.match(/postfix/)) {
        letter = 'P';
    }else if (data.name.match(/sasl/)) {
        letter = 'S';
    }

    iname = "markers/"+color+"_Marker"+letter+".png";

    var icon = L.icon({
        iconUrl: iname,
        iconAnchor: [10, 34]
    });


    var html = "<b>" + data.name + " " + "</b><br />" + data.country + ", "+data.city+" <br/>" + data.ip;

    L.marker({lon: data.longitude, lat: data.latitude}, {icon: icon}).bindPopup(html).addTo(map);
}


function getColor(d) {
    if(typeof(countryCounter[d]) != 'undefined'){
      d=countryCounter[d].count;
    }else{
      d=0;
    }
    
    return d > maxPerCountry*90/100 ? '#800026' :
           d > maxPerCountry*80/100  ? '#BD0026' :
           d > maxPerCountry*70/100  ? '#E31A1C' :
           d > maxPerCountry*60 /100 ? '#FC4E2A' :
           d > maxPerCountry*50/100   ? '#FD8D3C' :
           d > maxPerCountry*40/100   ? '#FEB24C' :
           d > maxPerCountry*30/100   ? '#FED976' :
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

var oldinfowindow = null;
var map;

$(document).ready(function() {
   // initialize Leaflet
    //map = L.map('map').setView({lon: 0, lat: 0}, 2);

    map = L.map('map', {
        center: [0, 0],
        zoom: 2
    });

    // add the OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      worldCopyJump: true,
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);


    // show the scale bar on the lower left corner
    L.control.scale().addTo(map);
    loadmarkers();

    //need stats
    //L.geoJson(countryData, {style: style}).addTo(map);


    var myVar = setInterval(function() {
        updatex();
    }, 1000 * 60 * 5);
});
