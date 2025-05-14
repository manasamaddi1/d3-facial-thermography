// main.js

const svg = d3.select("#faceSVG");

let currentGender = "Female";

// Female and Male face image paths
const faceImages = {
  Female: "data/female_face.png",
  Male: "data/male_face.png"
};

// Define coordinates for both genders
const regionCoordinates = {
  Female: [
    { name: "centerForehead", cx: 200, cy: 140, temp: 37 },
    { name: "leftForehead", cx: 140, cy: 170, temp: 37 },
    { name: "rightForehead", cx: 260, cy: 170, temp: 37 },
    { name: "topForehead", cx: 200, cy: 170, temp: 37 },
    { name: "bottomForehead", cx: 200, cy: 200, temp: 37 },
    { name: "leftEyeCorner", cx: 170, cy: 255, temp: 37 },
    { name: "rightEyeCorner", cx: 225, cy: 255, temp: 37 },
    { name: "mouth", cx: 200, cy: 365, temp: 37 }
  ],
  Male: [
    { name: "centerForehead", cx: 210, cy: 160, temp: 37 },
    { name: "leftForehead", cx: 150, cy: 170, temp: 37 },
    { name: "rightForehead", cx: 265, cy: 170, temp: 37 },
    { name: "topForehead", cx: 210, cy: 130, temp: 37 },
    { name: "bottomForehead", cx: 210, cy: 190, temp: 37 },
    { name: "leftEyeCorner", cx: 185, cy: 235, temp: 37 },
    { name: "rightEyeCorner", cx: 230, cy: 235, temp: 37 },
    { name: "mouth", cx: 210, cy: 350, temp: 37 }
  ]
};

let regions = JSON.parse(JSON.stringify(regionCoordinates[currentGender]));

let image = svg.append("image")
  .attr("xlink:href", faceImages[currentGender])
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", 400)
  .attr("height", 500);

const colorScale = d3.scaleLinear()
  .domain([35, 36.5, 37.5, 38.5, 40])
  .range(["#b2dfdb", "#ffffcc", "#ffeb99", "#ffb347", "#d73027"]);

let circles = svg.selectAll("circle")
  .data(regions)
  .enter()
  .append("circle")
  .attr("id", d => d.name)
  .attr("cx", d => d.cx)
  .attr("cy", d => d.cy)
  .attr("r", 10)
  .attr("fill", d => colorScale(d.temp))
  .on("click", function (event, d) {
    d3.select("#tempSlider").property("value", d.temp);
    d3.select("#tempDisplay").text(d.temp.toFixed(1));
    selectedRegion = d;
    d3.selectAll("circle").classed("selected", false);
    d3.select(this).classed("selected", true);
  })
  .on("mouseover", function (event, d) {
    d3.select("#tooltip")
      .style("display", "block")
      .html(`<strong>${d.name}</strong>: ${d.temp.toFixed(1)}°C`);
  })
  .on("mousemove", function (event) {
    d3.select("#tooltip")
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 28) + "px");
  })
  .on("mouseout", function () {
    d3.select("#tooltip").style("display", "none");
  });

let selectedRegion = null;
let selectedAgeRange = "all";
let selectedGender = "Female";
let currentOffsets = {};
let selectedGroup = d3.select("#groupSelect").property("value");

loadAndComputeOffsets(selectedGroup);

d3.select("#groupSelect").on("change", function () {
  selectedGroup = this.value;
  loadAndComputeOffsets(selectedGroup);
});

d3.select("#genderSelect").on("change", function () {
  selectedGender = this.value;
  currentGender = selectedGender === "Male" ? "Male" : "Female";

  // Update image
  image.attr("xlink:href", faceImages[currentGender]);

  // Replace circles with new coordinates
  regions = JSON.parse(JSON.stringify(regionCoordinates[currentGender]));

  circles.data(regions)
    .attr("cx", d => d.cx)
    .attr("cy", d => d.cy)
    .attr("fill", d => colorScale(d.temp));

  loadAndComputeOffsets(selectedGroup);
});

d3.select("#ageSelect").on("change", function () {
  selectedAgeRange = this.value;
  loadAndComputeOffsets(selectedGroup);
});

d3.select("#tempSlider").on("input", function () {
  const baseTemp = +this.value;
  d3.select("#tempDisplay").text(baseTemp.toFixed(1));

  if (selectedRegion && currentOffsets[selectedRegion.name]) {
    regions.forEach(region => {
      const offset = currentOffsets[selectedRegion.name][region.name];
      region.temp = baseTemp + offset;

      d3.select(`#${region.name}`)
        .attr("fill", colorScale(region.temp));

      d3.select(`#${region.name}`).classed("glow", d3.select("#alertToggle").property("checked") && region.temp >= 38);
    });

    document.getElementById("feedbackText").textContent =
      baseTemp < 36 ? "Low temp — possible chill." :
      baseTemp < 38 ? "Normal temperature." :
      "🌡️ High fever detected. Seek care.";

    generateDiagnosis();
  }
});

d3.select("#alertToggle").on("change", function () {
  const alertOn = this.checked;
  circles.each(function (d) {
    d3.select(this).classed("glow", alertOn && d.temp >= 38);
  });
});

function loadAndComputeOffsets(group) {
  const path = `data/cleaned_FLIR_${group}.csv`;

  const regionsList = Object.keys(regionCoordinates.Female).map((_, i) => regionCoordinates.Female[i].name);

  const regionToColumn = {
    centerForehead: "T_FHCC1",
    leftForehead: "T_FHLC1",
    rightForehead: "T_FHRC1",
    topForehead: "T_FHTC1",
    bottomForehead: "T_FHBC1",
    leftEyeCorner: "T_LC1",
    rightEyeCorner: "T_RC1",
    mouth: "T_OR_Max1"
  };

  d3.csv(path).then(data => {
    data = data.filter(d => {
      const ageGroup = d.Age;
      const gender = d.Gender;
      return (selectedAgeRange === "all" || selectedAgeRange === ageGroup) &&
             (selectedGender === "all" || selectedGender === gender);
    });

    data.forEach(d => {
      regionsList.forEach(r => {
        d[regionToColumn[r]] = +d[regionToColumn[r]];
      });
    });

    const offsetMatrix = {};
    regionsList.forEach(baseRegion => {
      offsetMatrix[baseRegion] = {};
      regionsList.forEach(targetRegion => {
        const diffs = data.map(d =>
          d[regionToColumn[targetRegion]] - d[regionToColumn[baseRegion]]
        );
        offsetMatrix[baseRegion][targetRegion] = d3.mean(diffs);
      });
    });

    currentOffsets = offsetMatrix;
    if (selectedRegion && currentOffsets[selectedRegion.name]) {
      const baseTemp = +d3.select("#tempSlider").property("value");
      regions.forEach(region => {
        const offset = currentOffsets[selectedRegion.name][region.name];
        region.temp = baseTemp + offset;
        d3.select(`#${region.name}`)
          .attr("fill", colorScale(region.temp))
          .classed("glow", d3.select("#alertToggle").property("checked") && region.temp >= 38);
      });
    }
  });
}

function generateDiagnosis() {
  const list = document.getElementById("diagnosisList");
  list.innerHTML = "";

  const grouped = {
    fever: [],
    eye: [],
    mouth: []
  };

  regions.forEach(region => {
    const temp = region.temp;
    if (region.name.includes("Forehead") && temp >= 38) grouped.fever.push(region);
    else if (region.name.includes("EyeCorner") && temp >= 38) grouped.eye.push(region);
    else if (region.name === "mouth" && temp >= 38) grouped.mouth.push(region);
  });

  if (grouped.fever.length) {
    const temp = grouped.fever[0].temp.toFixed(1);
    list.innerHTML += `<li>⚠️ <strong>Forehead region</strong>: ${temp}°C — Possible fever. Hydrate, rest, and monitor body temperature.</li>`;
  }
  if (grouped.eye.length) {
    const temp = grouped.eye[0].temp.toFixed(1);
    list.innerHTML += `<li>⚠️ <strong>Periorbital region</strong>: ${temp}°C — Eye strain or sinus issue. Reduce screen time, consider antihistamines.</li>`;
  }
  if (grouped.mouth.length) {
    const temp = grouped.mouth[0].temp.toFixed(1);
    list.innerHTML += `<li>⚠️ <strong>Mouth</strong>: ${temp}°C — Possible oral inflammation. Monitor symptoms, hydrate, and seek care.</li>`;
  }

  if (list.innerHTML === "") {
    list.innerHTML = "<li>No issues detected.</li>";
  }

  document.getElementById("diagnosisBox").style.display = "block";
}

d3.select("#resetButton").on("click", function () {
  selectedRegion = null;

  regions.forEach(region => {
    region.temp = 37;
    d3.select(`#${region.name}`)
      .attr("fill", colorScale(region.temp))
      .classed("glow", false);
  });

  d3.select("#tempSlider").property("value", 37);
  d3.select("#tempDisplay").text("37.0");
  d3.select("#tooltip").style("display", "none");
  d3.selectAll("circle").classed("selected", false);
  document.getElementById("feedbackText").textContent =
    "Click a region and use the slider to see feedback here.";
  document.getElementById("diagnosisList").innerHTML = "";
  document.getElementById("diagnosisBox").style.display = "none";
});

loadAndComputeOffsets(selectedGroup);
