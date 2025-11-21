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
    
    // STEP 1: Load markers FIRST for faster page display
    $.getJSON("get.php?action=markers", function(markerData) {
        if (markerData && Array.isArray(markerData)) {
            for (var i in markerData) {
                createMarker(markerData[i]);
            }
        }
        
        // STEP 2: Load stats AFTER markers (non-blocking)
        $.getJSON("get.php?action=stats", function(data) {
            // Safety checks for undefined data
            if (!data) {
                hideLoader();
                return;
            }
            
            stats = data;
            $('.stat ol').empty();
            
            // Optimisation: construire le HTML en une seule fois au lieu de multiples append
            var top5Html = '';
            var last5Html = '';
            var lastipsHtml = '';
            var protosHtml = '';
            
            // Check arrays before processing
            if (data['totals'] && Array.isArray(data['totals'])) {
                for(var i = 0; i < data['totals'].length; i++) {
                    var j = data['totals'][i];
                    top5Html += "<li><img src='images/flags/" + j.code + ".png' alt='" + j.code + "' /> " + j.country + " (" + j.count + ")</li>";
                }
            }
            
            if (data['last'] && Array.isArray(data['last'])) {
                for(var i = 0; i < data['last'].length; i++) {
                    var j = data['last'][i];
                    last5Html += "<li title='" + j.timestamp + "'><img src='images/flags/" + j.code + ".png' alt='" + j.code + "' /> " + j.country + "</li>";
                }
            }
            
            if (data['lastips'] && Array.isArray(data['lastips'])) {
                for(var i = 0; i < data['lastips'].length; i++) {
                    var j = data['lastips'][i];
                    lastipsHtml += "<li title='" + j.country + " - " + j.timestamp + "'><img src='images/flags/" + j.code + ".png' alt='" + j.code + "' /> " + j.timestamp.split(' ')[1] + " <a href='#' onclick='whois(\"" + j.id + "\");return false;'>" + j.ip + "</a></li>";
                }
            }
            
            if (data['protos'] && Array.isArray(data['protos'])) {
                for(var i = 0; i < data['protos'].length; i++) {
                    var j = data['protos'][i];
                    protosHtml += "<li>" + j.name + " (" + j.count + ")</li>";
                }
            }
            
            $("#top5").html(top5Html);
            $("#last5").html(last5Html);
            $("#lastips").html(lastipsHtml);
            $("#protocols").html(protosHtml);

            if (data['totalpercountry']) {
                countryCounter = data['totalpercountry'];
                
                // Calculate color thresholds based on percentiles (dynamic distribution)
                var countryCounts = [];
                for(let i in countryCounter){
                  var c = parseInt(countryCounter[i].count);
                  countryCounts.push(c);
                  if(c>maxPerCountry)maxPerCountry=c;
                }
                
                // Sort counts in descending order
                countryCounts.sort(function(a, b){return b - a});
                console.log(countryCounts);
                // Calculate percentile thresholds for dynamic color distribution
                if(countryCounts.length > 0){
                                    
                  colorThresholds = [
                    countryCounts[Math.floor(countryCounts.length * 0.01)],      // Top 1% - Très rouge foncé
                    countryCounts[Math.floor(countryCounts.length * 0.10)],      // Top 10% - Rouge foncé
                    countryCounts[Math.floor(countryCounts.length * 0.25)],      // Top 25% - Rouge
                    countryCounts[Math.floor(countryCounts.length * 0.50)],      // Top 50% - Orange-rouge
                    countryCounts[Math.floor(countryCounts.length * 0.75)],      // Top 75% - Orange
                    countryCounts[Math.floor(countryCounts.length * 0.90)],      // Top 90% - Orange clair
                    countryCounts[Math.floor(countryCounts.length * 0.99)],      // Top 99% - Jaune
                    1       // Rest (>=1 ban) - Jaune très clair
                  ];
                }else{
                  colorThresholds = [maxPerCountry, maxPerCountry * 0.8, maxPerCountry * 0.6, maxPerCountry * 0.4, maxPerCountry * 0.2, maxPerCountry * 0.1, maxPerCountry * 0.01, 1];
                }
            }

            if (data['totalip'] && data['totalip'][0]) {
                $("#ipsblocked").html(" " + data['totalip'][0].count);
            }
            if (data['ipban'] && data['ipban'][0]) {
                $("#ipsban").html(" " + data['ipban'][0].count);
            }
            if (data['totalcountry'] && data['totalcountry'][0]) {
                $("#countriesclocked").html(" " + data['totalcountry'][0].count);
            }

            if(typeof(colorizedCountryLayer) == 'undefined'){
                colorizedCountryLayer=L.geoJson(countryData, {style: style});
                colorizedCountryLayer.addTo(map);
                layerControl.addOverlay(colorizedCountryLayer, "Country colorization");
            }else{
                colorizedCountryLayer.addData(countryData, {style: style});
            }
            
            hideLoader();

        }).fail(function() {
            console.warn("Stats loading failed, but markers are displayed");
            hideLoader();
        });

    }).fail(function() {
        console.error("Failed to load markers");
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
      d=parseInt(countryCounter[d].count);
    }else{
      d=0;
    }
    
    return d >= colorThresholds[0] ? '#800026' :  
           d >= colorThresholds[1] ? '#BD0026' :  
           d >= colorThresholds[2] ? '#E31A1C' :  
           d >= colorThresholds[3] ? '#FC4E2A' :  
           d >= colorThresholds[4] ? '#FD8D3C' :  
           d >= colorThresholds[5] ? '#FEB24C' :  
           d >= colorThresholds[6] ? '#FED976' :  
           d >= colorThresholds[7] ? '#FFEDA0' :  
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
    $('#whois .modal-body').html('<div class="text-center p-5"><div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div><p class="mt-2">Fetching WHOIS and Ban History...</p></div>');
    $('#whois').modal('show');
    
    $.getJSON("get.php?action=whois&ip="+id, function(data) {
        if(data.exit_code && data.exit_code > 0) {
            $('#whois .modal-body').html('<div class="alert alert-danger">' + data.message + '</div>');
            return;
        }

        $('#whois .modal-title').html(data.ip + ' <span class="badge badge-danger ml-2">' + data.total_bans + ' bans</span>');
        
        var historyHtml = '<div class="table-responsive"><table class="table table-striped table-hover table-sm"><thead><tr><th>Date</th><th>Jail</th><th>Protocol</th><th>Ports</th><th>Location</th><th>Status</th></tr></thead><tbody>';
        
        if(data.history && data.history.length > 0){
            for(var i=0; i<data.history.length; i++){
                var h = data.history[i];
                var status = h.ban == 1 ? '<span class="badge badge-danger">Banned</span>' : '<span class="badge badge-success">Released</span>';
                var location = (h.city ? h.city + ', ' : '') + (h.country || '');
                historyHtml += '<tr><td>' + h.timestamp + '</td><td>' + h.name + '</td><td>' + (h.protocol || '-') + '</td><td>' + (h.ports || '-') + '</td><td>' + location + '</td><td>' + status + '</td></tr>';
            }
        } else {
            historyHtml += '<tr><td colspan="6" class="text-center">No history found</td></tr>';
        }
        historyHtml += '</tbody></table></div>';
        
        var whoisContent = data.whois ? data.whois : 'No WHOIS data available';
        
        var tabsHtml = `
            <ul class="nav nav-tabs" id="whoisTab" role="tablist">
              <li class="nav-item">
                <a class="nav-link active" id="history-tab" data-toggle="tab" href="#history" role="tab" aria-controls="history" aria-selected="true">Ban History</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" id="raw-tab" data-toggle="tab" href="#raw" role="tab" aria-controls="raw" aria-selected="false">WHOIS Data</a>
              </li>
            </ul>
            <div class="tab-content" id="whoisTabContent">
              <div class="tab-pane fade show active p-3" id="history" role="tabpanel" aria-labelledby="history-tab">
                ${historyHtml}
              </div>
              <div class="tab-pane fade p-3" id="raw" role="tabpanel" aria-labelledby="raw-tab">
                <pre class="bg-light p-3 border rounded" style="max-height: 500px; overflow-y: auto; font-size: 0.85rem;">${whoisContent}</pre>
              </div>
            </div>
        `;
        
        $('#whois .modal-body').html(tabsHtml);
    }).fail(function() {
        $('#whois .modal-body').html('<div class="alert alert-danger">Failed to load data.</div>');
    });
}

var map;

$(document).ready(function() {
   map = L.map('map', {
        center: [0, 0],
        zoom: 2,
        maxBounds: [
            [-90, -180],
            [90, 180]
        ]
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


