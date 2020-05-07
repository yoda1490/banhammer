      var map;

      function clearOverlays() {
      for (var i = 0; i < markersArray.length; i++ ) {
      markersArray[i].setMap(null);
      }
        markersArray.length = 0;
      }

      function updatex()
      {
          clearOverlays();
	  loadmarkers();
      }

      function loadmarkers()
      {


 	$.getJSON("getmarkers.php", function( data ) {

          for (var i in data) {
            var name = data[i].geo;
            var address = data[i].ip;
            var type = data[i].name;
            var point = new google.maps.LatLng(parseFloat(data[i].latitude),parseFloat(data[i].longitude));
            createMarker(point, name, address, type);
	  } 
	 });

	$.getJSON("getstats.php", function( data ) 
	{

		var totals = data['totals'];
		var countrys = data['last'];
		var protos = data['protos'];

		for (var i in totals)
		{
			var country = totals[i].country;
			var count = totals[i].count;
			var name = country_code_to_country(country);
			$("#top5").append("<li><img src=\"images/flags/"+country+".png\" alt=\""+country+"\" title=\"\" /> "+name+" ("+count+")"+"</li>");
		}

		for (var i in countrys)
		{
			var country = countrys[i].country;
			var name = country_code_to_country(country);
			$("#last5").append("<li><img src=\"images/flags/"+country+".png\" alt=\""+country+"\" title=\"\" /> "+name+"</li>");
		}

		for (var i in protos)
		{
			var name = protos[i].name;
			var count = protos[i].count;

			$("#protocols").append("<li>"+name+" ("+count+")</li>");
		}
	
		 $("#ipsblocked").html(" "+data['totalip'][0].count);
		 $("#countriesclocked").html(" "+data['totalcountry'][0].count);

	});


      }

      function createMarker(point, name, address, type) {

          words = type+" attack from "+address+"\n"+name;

          iname="markers/red_MarkerA.png"

          if(type=="wordpress")
	  {
             iname="markers/blue_MarkerA.png"
	  }
          if(type=="ssh")
	  {
             iname="markers/yellow_MarkerA.png"
	  }
          if(type=="dovecot")
	  {
             iname="markers/green_MarkerA.png"
	  }
          if(type=="sasl")
	  {
             iname="markers/brown_MarkerA.png"
	  }
    
	

          var marker = new google.maps.Marker({
                position: point,
                title:name,
                icon: iname
                });

          marker.setMap(map);

          var html = "<b>" + type+ " ATTACK" + "</b><br />"+name + "<br/>" + address;

          var infowindow = new google.maps.InfoWindow({
              content: html
          });

          google.maps.event.addListener(marker, 'click', (function() {
              infowindow.open(map, marker);

 	      if(oldinfowindow!=null)
              {
                   oldinfowindow.close();
              }

	      oldinfowindow=infowindow;
         }));
      }


      function initialize() {
          var mapOptions = {
              center: new google.maps.LatLng(50.448807, -3.746826),
              zoom: 2
          };
          map = new google.maps.Map(document.getElementById("map_canvas"),mapOptions);

 	  loadmarkers();
      }

      function myTimer()
      {
	  updatex();
      }

      var oldinfowindow=null;	

      google.maps.event.addDomListener(window, 'load', initialize);

      var myVar=setInterval(function(){myTimer()},1000*60*5);

