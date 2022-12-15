var map = L.map('map').setView([51.505, -0.09], 13);

var selected_path;

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

  
const options = {
	attributeNamePrefix : "",
	//attrNodeName: false,
	//textNodeName : "#text",
	ignoreAttributes : false,
	ignoreNameSpace: false,
  };

const parser = new XMLParser(options);
  



function create_polyline(data)
{
	
		var polyline = L.polyline(data, {color: 'black'}).addTo(map);
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
	}

function set_team(color)
{
	if(selected_path)
	{
		selected_path.setStyle({color:color});
		selected_path.redraw();
	}
}

$.get('../data/fred-path.gpx', function(data)
{
	console.log("debut")
	console.log(data)
	let jObj = parser.parse(data.documentElement.outerHTML);
	console.log("parser")
	console.log(jObj)
	console.log(jObj.gpx.trk.trkseg)
	let myarr2 = []
	for (pt of jObj.gpx.trk.trkseg.trkpt)
		myarr2.push([parseFloat(pt.lat),parseFloat(pt.lon)])
	create_polyline(myarr2);
	/*console.log("data")
	console.log(data)
	new L.GPX(data, {async: true}).on('loaded', function(e) {
		console.log("e")
		console.log(e)
		map.fitBounds(e.target.getBounds());
	  }).addTo(map);*/
});