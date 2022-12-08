var map = L.map('map').setView([51.505, -0.09], 13);

var selected_path;

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);


function create_polyline(data)
{
	data.paths.forEach(element => {
		var polyline = L.polyline(element, {color: 'black'}).addTo(map);
		map.fitBounds(polyline.getBounds());

	
		polyline.on('click', 
		(event) =>
		{
			var popLocation= event.latlng;

			L.popup()
			.setLatLng(popLocation)
			.setContent('<p> Hello world!<br />This is a nice popup. </p>')
			.openOn(map);
			
			if(selected_path) selected_path.setStyle({weight:3});
			polyline.setStyle({weight:5});
			polyline.redraw();
			
			selected_path = polyline;
		});
	});

	
}

function set_team(color)
{
	if(selected_path)
	{
		selected_path.setStyle({color:color});
		selected_path.redraw();
	}
}

$.getJSON('get-path', function(data)
{
	console.log(data)
	create_polyline(data);
});