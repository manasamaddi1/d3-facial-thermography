// main.js

const svg = d3.select("#faceSVG");
const tempSlider = d3.select("#tempSlider");
const tempDisplay = d3.select("#tempDisplay");
const recommendationPanel = d3.select("#recommendationPanel");

const colorScale = d3.scaleLinear()
  .domain([35, 37.5, 40])
  .range(["#4575b4", "#ffffbf", "#d73027"]);

let selectedRegion = null;
let regionTemps = {
  forehead: 37.0,
  leftEye: 37.0,
  rightEye: 37.0,
  nose: 37.0,
  mouth: 37.0
};

svg.selectAll("*").remove();

svg.append("image")
  .attr("xlink:href", "data/face.png")
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", 400)
  .attr("height", 500);

const regions = [
  { name: "forehead", cx: 200, cy: 110 },
  { name: "leftEye", cx: 150, cy: 190 },
  { name: "rightEye", cx: 250, cy: 190 },
  { name: "nose", cx: 200, cy: 260 },
  { name: "mouth", cx: 200, cy: 330 }
];

regions.forEach(region => {
  svg.append("circle")
    .attr("class", "region")
    .attr("id", region.name)
    .attr("cx", region.cx)
    .attr("cy", region.cy)
    .attr("r", 25)
    .attr("fill", colorScale(regionTemps[region.name]))
    .attr("stroke", "#222")
    .style("cursor", "pointer")
    .on("click", function () {
      selectedRegion = region.name;
      tempSlider.property("value", regionTemps[selectedRegion]);
      tempDisplay.text(regionTemps[selectedRegion].toFixed(1));
      d3.selectAll(".region").attr("stroke-width", 1);
      d3.select(this).attr("stroke-width", 3);
      updateRecommendation(regionTemps[selectedRegion]);
    });
});

tempSlider.on("input", function () {
  const newTemp = +this.value;
  tempDisplay.text(newTemp.toFixed(1));
  if (selectedRegion) {
    regionTemps[selectedRegion] = newTemp;
    d3.select(`#${selectedRegion}`).attr("fill", colorScale(newTemp));
    updateRecommendation(newTemp);
  }
});

function updateRecommendation(temp) {
  if (temp < 36.0) {
    recommendationPanel.text("Temperature is below average. Check for hypothermia symptoms.");
  } else if (temp < 37.5) {
    recommendationPanel.text("Normal temperature range.");
  } else if (temp < 38.5) {
    recommendationPanel.text("Mild fever detected. Monitor closely.");
  } else {
    recommendationPanel.text("High fever detected. Medical attention may be needed.");
  }
}

d3.selectAll("input[name='group']").on("change", function () {
  const selectedGroup = this.value;
  const csvFile = selectedGroup === "group1"
    ? "data/cleaned_FLIR_group1.csv"
    : "data/cleaned_FLIR_group2.csv";

  d3.csv(csvFile).then(data => {
    const foreheadKey = "T_FHCC1";
    const leftKey = "T_LC1";
    const rightKey = "T_RC1";
    const mouthKey = "T_OR1";
    const noseKey = "T_FHRC1";

    if (data.length > 0) {
      regionTemps.forehead = +data[0][foreheadKey] || 37.0;
      regionTemps.leftEye = +data[0][leftKey] || 37.0;
      regionTemps.rightEye = +data[0][rightKey] || 37.0;
      regionTemps.mouth = +data[0][mouthKey] || 37.0;
      regionTemps.nose = +data[0][noseKey] || 37.0;

      regions.forEach(region => {
        d3.select(`#${region.name}`).attr("fill", colorScale(regionTemps[region.name]));
      });
    }
  }).catch(err => {
    console.error("Failed to load CSV:", err);
  });
});
