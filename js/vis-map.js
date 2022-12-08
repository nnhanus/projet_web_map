var map = L.map('map').setView([51.505, -0.09], 13);
var selected;

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);


function create_polyline(data)
{
	var polyline;
	data.paths.forEach(element => {
		polyline = L.polyline(element, {color: 'black'}).addTo(map);
		map.fitBounds(polyline.getBounds());

	
		polyline.on('click', 
		(event) =>
		{
			var popLocation= event.latlng;

			L.popup()
			.setLatLng(popLocation)
			.setContent('<p> Hello world!<br />This is a nice popup. </p>')
			.openOn(map);
			
			if(selected) selected.setStyle({weight:3});
			polyline.setStyle({weight:5});
			polyline.redraw();
			
			selected = polyline;
		});
	});

	
}

function set_team(color)
{
	if(selected)
	{
		selected.setStyle({color:color});
		selected.redraw();
	}
}

$.getJSON('get-path', function(data)
{
	console.log(data)
	create_polyline(data);
});