/*****************************************************************
  0 · HELPERS
*****************************************************************/
const isMobile = () => window.matchMedia('(max-width:500px)').matches;

function makeToggle(ctrl, icon){
  return {
    onAdd(){
      const btn = document.createElement('button');
      btn.className = 'mapboxgl-ctrl toggle-btn';
      btn.textContent = icon;
      btn.onclick = () => ctrl._div.classList.toggle('mobile-shown');
      return btn;
    },
    onRemove(){}
  };
}

function sizeRadius(v){
  return v<5?4 : v<20?9 : v<50?10 : v<100?12 : v<200?6 : v<400?6 : 6;
}

function embedPhoto(blob){
  if(!blob) return '';
  const url = blob.split(',')[0].trim();
  const id  = url.match(/\/file\/d\/([^/]+)/)?.[1];
  const src = id ? `https://lh3.googleusercontent.com/d/${id}=w1600` : url;
  return `<div style="aspect-ratio:16/9;width:100%;margin-top:6px;border-radius:6px;overflow:hidden">
            <img src="${src}" style="width:100%;height:100%;object-fit:cover;border:0;">
          </div>`;
}

function prettyMonthYear(s){
  if(!s) return s;
  const [mon, yy] = s.split('-');
  const monthNames = {
    Jan:'January', Feb:'February', Mar:'March', Apr:'April', May:'May', Jun:'June',
    Jul:'July', Aug:'August', Sep:'September', Oct:'October', Nov:'November', Dec:'December'
  };
  const longMonth = monthNames[mon] || mon;
  return `${longMonth} 20${yy}`;
}

const clean = s => (s||'')
                   .replace(/[^\p{L}\s]/gu, '')
                   .toLowerCase()
                   .trim();

// Function to decode HTML entities and fix character encoding
function decodeText(text) {
  if (!text) return text;
  
  // Create a temporary DOM element to decode HTML entities
  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  let decoded = textArea.value;
  
  // Fix common encoding issues
  decoded = decoded
    .replace(/Ã©/g, 'é')  // Fix é character
    .replace(/Ã¨/g, 'è')  // Fix è character  
    .replace(/Ã¡/g, 'á')  // Fix á character
    .replace(/Ã­/g, 'í')  // Fix í character
    .replace(/Ã³/g, 'ó')  // Fix ó character
    .replace(/Ã¼/g, 'ü')  // Fix ü character
    .replace(/Ã±/g, 'ñ')  // Fix ñ character
    .replace(/Ã§/g, 'ç')  // Fix ç character
    .replace(/â€™/g, "'") // Fix apostrophe
    .replace(/â€œ/g, '"') // Fix left quote
    .replace(/â€/g, '"')  // Fix right quote
    .replace(/â€"/g, '–') // Fix en dash
    .replace(/â€"/g, '—'); // Fix em dash
  
  return decoded;
}

// Function to update marker scale based on zoom
function updateMarkerSizes() {
  const zoom = map.getZoom();
  const scale = Math.max(0.4, Math.min(1.5, (zoom - 3) / 6));
  
  // Update CSS custom property on document root
  document.documentElement.style.setProperty('--marker-scale', scale);
}

/*****************************************************************
  STATS
*****************************************************************/
const stats = {
  marathons: {cnt:0, fullMarathons:0, halfMarathons:0, countries:0},
};

function parseNum(raw){
  if(!raw) return 0;
  return parseFloat(
           String(raw)
           .replace(/[^\d.,-]/g,'')
           .replace(/\./g,'')
           .replace(',', '.')
         ) || 0;
}

/*****************************************************************
  GEOJSON URL
*****************************************************************/
const GEOJSON_URL = './marathons.geojson';

/*****************************************************************
  GLOBALS
*****************************************************************/
const markers = [];
let hoverPopup = null;
let marathonLandingPageLink = null;

// Dynamic country detection from actual data
function getAvailableCountries(marathonType = 'ALL', year = 'ALL') {
  const countries = new Set();
  
  markers.forEach(marker => {
    const typeMatch = (marathonType === 'ALL') || (marker.marathonType === marathonType);
    const yearMatch = (year === 'ALL') || (marker.year === year);
    
    if (typeMatch && yearMatch) {
      countries.add(marker.country);
    }
  });
  
  // Sort by country names alphabetically
  return Array.from(countries).sort();
}

// Function to get available years from marathon data
function getAvailableYears() {
  const years = new Set();
  markers.forEach(marker => {
    if (marker.year) {
      years.add(marker.year);
    }
  });
  return Array.from(years).sort();
}

/*****************************************************************
  UI CLASSES
*****************************************************************/

class SummaryBox{
  constructor(html='Calculating…'){this.html=html;}
  onAdd(){const d=document.createElement('div');d.className='mapboxgl-ctrl summary-box';d.innerHTML=this.html;return(this._div=d);}
  set(h){this.html=h;if(this._div)this._div.innerHTML=h;}
  onRemove(){this._div.remove();}
}

class FiltersCard{
  constructor(){this.marathonType='ALL'; this.selectedCountry='ALL'; this.selectedYear='ALL';}
  onAdd(){
    const d=document.createElement('div');
    d.className='mapboxgl-ctrl info-box';
    d.innerHTML=`<h4>Filter Marathons</h4><hr class="sep">
      <div style="display:flex;gap:6px">
        <button class="dist-btn is-active" data-type="ALL">All</button>
        <button class="dist-btn"            data-type="Full Marathon">Full</button>
        <button class="dist-btn"            data-type="Half Marathon">Half</button>
      </div>
      <div style="margin-top:10px;">
        <label style="color:#fff;font-size:12px;margin-bottom:4px;display:block;">Select Country:</label>
        <select id="country-dropdown" class="country-dropdown">
          <option value="ALL">All Countries</option>
        </select>
      </div>
      <div style="margin-top:10px;">
        <label style="color:#fff;font-size:12px;margin-bottom:4px;display:block;">Select Year:</label>
        <select id="year-dropdown" class="country-dropdown">
          <option value="ALL">All Years</option>
        </select>
      </div>
      <div id="marathon-landing-btn" style="margin-top:10px;">
        <button class="dist-btn landing-page-btn" onclick="openMarathonLandingPage()">View Marathon Page</button>
      </div>`;
      
    // Handle marathon type buttons
    d.querySelectorAll('.dist-btn:not(.landing-page-btn)').forEach(btn=>{
      btn.onclick = _=>{
        d.querySelectorAll('.dist-btn:not(.landing-page-btn)').forEach(b=>b.classList.toggle('is-active',b===btn));
        this.marathonType = btn.dataset.type;
        this.updateCountryDropdown();
        this.updateYearDropdown();
        apply();
      };
    });
    
    // Handle country dropdown
    const dropdown = d.querySelector('#country-dropdown');
    dropdown.onchange = _=>{
      this.selectedCountry = dropdown.value;
      apply();
    };
    
    // Handle year dropdown
    const yearDropdown = d.querySelector('#year-dropdown');
    yearDropdown.onchange = _=>{
      this.selectedYear = yearDropdown.value;
      this.updateCountryDropdown();
      apply();
    };
    
    return(this._div=d);
  }
  
  updateCountryDropdown(){
    const dropdown = this._div.querySelector('#country-dropdown');
    if (!dropdown) return;
    
    // Get available countries based on current filters
    const availableCountries = getAvailableCountries(this.marathonType, this.selectedYear);
    
    // Clear current options
    dropdown.innerHTML = '<option value="ALL">All Countries</option>';
    
    // Add filtered country options
    availableCountries.forEach(country => {
      const option = document.createElement('option');
      option.value = country;
      option.textContent = country;
      dropdown.appendChild(option);
    });
    
    // Check if current selection is still valid
    if (this.selectedCountry !== 'ALL' && !availableCountries.includes(this.selectedCountry)) {
      this.selectedCountry = 'ALL';
      dropdown.value = 'ALL';
    }
  }
  
  updateYearDropdown(){
    const dropdown = this._div.querySelector('#year-dropdown');
    if (!dropdown) return;
    
    // Get available years
    const availableYears = getAvailableYears();
    
    // Clear current options
    dropdown.innerHTML = '<option value="ALL">All Years</option>';
    
    // Add year options
    availableYears.forEach(year => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      dropdown.appendChild(option);
    });
    
    // Check if current selection is still valid
    if (this.selectedYear !== 'ALL' && !availableYears.includes(this.selectedYear)) {
      this.selectedYear = 'ALL';
      dropdown.value = 'ALL';
    }
  }
  
  onRemove(){this._div.remove();}
}

/***** 2 · INFO CARD *************************************************/
class InfoBox{
  onAdd(){
    const d=document.createElement('div');
    d.className='mapboxgl-ctrl info-box';
    d.innerHTML=`<h4>Marathon Map</h4><hr class="sep">
      <p>Interactive overview of marathons worldwide.</p>
     <p>Hover for the name, click for full details. Filter by marathon type, country, or year.</p>`;
    return (this._div=d);
  }
  onRemove(){this._div.remove();}
}

/*****************************************************************
  MAP
*****************************************************************/
mapboxgl.accessToken='pk.eyJ1IjoibGlsbHlzdHVyeiIsImEiOiJjbWR5am51MHIwMnJmMmxzYXN1YW13enU4In0.x3ap6_z95LEbpwhlqsjzEg';

const map = new mapboxgl.Map({
  container:'map',
  style:'mapbox://styles/lillysturz/cmdyqbkk200ep01sc1lrf2kca',
  center:[30.5,25], zoom:2.7, maxZoom:22, preserveDrawingBuffer:true
});

const infoBox   = new InfoBox();
const summaryBox= new SummaryBox();
const filtersBox= new FiltersCard();

map.on('load',()=>{
  map.resize();
  // Load the marathon GeoJSON data
  loadGeoJSONData().then(() => {
    filtersBox.updateCountryDropdown();
    filtersBox.updateYearDropdown();
    apply();
  });
});

// Add zoom listener for marker scaling
map.on('zoom', updateMarkerSizes);

window.addEventListener('resize',()=>map.resize());

/*****************************************************************
  GEOJSON LOADER
*****************************************************************/
async function loadGeoJSONData(){
  try {
    console.log('Loading Marathon GeoJSON from:', GEOJSON_URL);
    const response = await fetch(`${GEOJSON_URL}?t=${Date.now()}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const geojsonData = await response.json();
    console.log('Marathon GeoJSON loaded successfully:', geojsonData);
    
    // Process each feature as marathon data
    geojsonData.features.forEach(feature => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates;
      
      // All features should be marathons
      drawMarathon(props, coords);
    });
    
    console.log('Total marathon markers created:', markers.length);
    // Initialize marker scaling
    updateMarkerSizes();
    
  } catch (error) {
    console.error('Error loading marathon GeoJSON data:', error);
  }
}

/*****************************************************************
  HOVER FUNCTIONALITY
*****************************************************************/
function addHoverToMarker(element, name, marker) {
  element.addEventListener('mouseenter', (e) => {
    if (hoverPopup) {
      hoverPopup.remove();
    }
    
    hoverPopup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'hover-tip',
      offset: 10
    })
    .setLngLat(marker.getLngLat())
    .setHTML(name)
    .addTo(map);
  });

  element.addEventListener('mouseleave', (e) => {
    if (hoverPopup) {
      hoverPopup.remove();
      hoverPopup = null;
    }
  });

  // Close hover popup when marker is clicked
  element.addEventListener('click', (e) => {
    if (hoverPopup) {
      hoverPopup.remove();
      hoverPopup = null;
    }
  });
}

/*****************************************************************
  DRAWERS
*****************************************************************/
function drawMarathon(props, coords){
  const [lon, lat] = coords;
  if(!Number.isFinite(lat) || !Number.isFinite(lon)) return;

  const marathonName = decodeText(props.name) || 'Marathon';
  const city = decodeText(props.city) || '';
  const country = decodeText(props.country) || '';
  const year = props.year || '';
  const marathonType = props.type || 'Marathon';
  const date = props.date || '';
  const availability = props.availability || '';
  const status = props.status || 'Available';
  const landingPage = props.landingPage || '';

  // Extract landing page link if available
  if (landingPage && !marathonLandingPageLink) {
    marathonLandingPageLink = landingPage.trim();
  }

  // Determine marker size based on marathon type
  const rad = marathonType === 'Full Marathon' ? 8 : 6;

  stats.marathons.cnt += 1;
  if (marathonType === 'Full Marathon') {
    stats.marathons.fullMarathons += 1;
  } else if (marathonType === 'Half Marathon') {
    stats.marathons.halfMarathons += 1;
  }

  const el = document.createElement('div');
  el.className = 'marker';
  el.style.width = el.style.height = `${rad*2}px`;
  
  // Color based on status
  if (status === 'Available') {
    el.classList.add('available');
  } else if (status === 'Sold Out') {
    el.classList.add('sold-out');
  } else if (status === 'Checking') {
    el.classList.add('checking');
  }

  // Create popup content
  let popupContent = `<div><strong>${marathonName}</strong><hr class="sep">`;
  if (city) popupContent += `<b>City:</b> ${city}<br>`;
  if (country) popupContent += `<b>Country:</b> ${country}<br>`;
  if (year) popupContent += `<b>Year:</b> ${year}<br>`;
  if (marathonType) popupContent += `<b>Type:</b> ${marathonType}<br>`;
  if (date) popupContent += `<b>Date:</b> ${date}<br>`;
  if (availability) popupContent += `<b>Availability:</b> ${availability}<br>`;
  if (status) popupContent += `<b>Status:</b> ${status}<br>`;
  if (landingPage) popupContent += `<hr class="sep"><a href="${landingPage}" target="_blank">More Info</a>`;
  popupContent += `</div>`;

  const m = new mapboxgl.Marker(el).setLngLat([lon,lat])
           .setPopup(new mapboxgl.Popup({offset:25}).setHTML(popupContent))
           .addTo(map);

  // Add hover functionality
  addHoverToMarker(el, marathonName, m);

  markers.push({
    marker: m, 
    marathonType: marathonType,
    country: country || city, // Use country if available, otherwise city
    year: year,
    name: marathonName,
    city: city,
    status: status
  });
}

/*****************************************************************
  FILTER / SUMMARY
*****************************************************************/
function updateSummary(marathonType, cntShown) {
  const selectedCountry = filtersBox.selectedCountry;
  const selectedYear = filtersBox.selectedYear;
  
  let html = `<h4>Marathon Summary</h4><hr class="sep">`;

  // Add filters to header if specific selections are made
  let headerParts = [];
  if (selectedCountry !== 'ALL') headerParts.push(selectedCountry);
  if (selectedYear !== 'ALL') headerParts.push(selectedYear);
  if (marathonType !== 'ALL') headerParts.push(marathonType);
  
  if (headerParts.length > 0) {
    html = `<h4>${headerParts.join(' - ')} Summary</h4><hr class="sep">`;
  }

  // Calculate statistics for visible marathons
  let totalMarathons = 0;
  let fullMarathons = 0;
  let halfMarathons = 0;
  let availableMarathons = 0;
  let soldOutMarathons = 0;
  let checkingMarathons = 0;
  let countries = new Set();

  markers.forEach(marker => {
    const countryMatch = (selectedCountry === 'ALL') || (marker.country === selectedCountry);
    const yearMatch = (selectedYear === 'ALL') || (marker.year === selectedYear);
    const typeMatch = (marathonType === 'ALL') || (marker.marathonType === marathonType);
    const isVisible = marker.marker.getElement().style.display !== 'none';
    
    if (countryMatch && yearMatch && typeMatch && isVisible) {
      totalMarathons++;
      countries.add(marker.country);
      
      if (marker.marathonType === 'Full Marathon') {
        fullMarathons++;
      } else if (marker.marathonType === 'Half Marathon') {
        halfMarathons++;
      }
      
      if (marker.status === 'Available') {
        availableMarathons++;
      } else if (marker.status === 'Sold Out') {
        soldOutMarathons++;
      } else if (marker.status === 'Checking') {
        checkingMarathons++;
      }
    }
  });

  html += `<b>Total Marathons:</b> ${totalMarathons}<br>`;
  if (marathonType === 'ALL') {
    html += `<b>Full Marathons:</b> ${fullMarathons}<br>`;
    html += `<b>Half Marathons:</b> ${halfMarathons}<br>`;
  }
  html += `<b>Countries:</b> ${countries.size}<br><br>`;
  html += `<b>Available:</b> ${availableMarathons}<br>`;
  html += `<b>Sold Out:</b> ${soldOutMarathons}<br>`;
  html += `<b>Checking:</b> ${checkingMarathons}`;
  
  summaryBox.set(html);
}

function apply(){
  const wantType = filtersBox.marathonType;
  const wantCountry = filtersBox.selectedCountry;
  const wantYear = filtersBox.selectedYear;
  let shown = 0;

  markers.forEach(marker=>{
    const okType = (wantType==='ALL') || (marker.marathonType===wantType);
    const okCountry = (wantCountry==='ALL') || (marker.country===wantCountry);
    const okYear = (wantYear==='ALL') || (marker.year===wantYear);
    
    const show = okType && okCountry && okYear;
    marker.marker.getElement().style.display = show ? '' : 'none';
    if(show){ shown++; }
  });
  
  updateSummary(wantType, shown);
}

// Function to open marathon landing page
function openMarathonLandingPage() {
  if (marathonLandingPageLink) {
    window.open(marathonLandingPageLink, '_blank');
  } else {
    alert('Marathon landing page link not found');
  }
}

/*****************************************************************
  CONTROLS
*****************************************************************/
map.addControl(infoBox,'top-left');
map.addControl(filtersBox,'top-left');
map.addControl(summaryBox,'top-left');
map.addControl(makeToggle(infoBox,'ℹ️'),'top-left');
map.addControl(makeToggle(filtersBox,'🔍'),'top-left');
map.addControl(makeToggle(summaryBox,'📊'),'top-left');
map.addControl(new mapboxgl.ScaleControl({maxWidth:isMobile()?80:120,unit:'metric'}),'bottom-right');
map.addControl(new mapboxgl.FullscreenControl({container:document.getElementById('mapWrap')}),'top-right');