var map = L.map('map').setView([51.505, -0.09], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);



$.getJSON('get-path', function(data){
    console.log(data)
    var polyline = L.polyline(data.path, {color: 'red'}).addTo(map);
    map.fitBounds(polyline.getBounds());
    
})