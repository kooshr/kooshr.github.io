// DrawTriangle.js (c) 2012 matsuda

function main() {  
  // Retrieve <canvas> element
  var canvas = document.getElementById('example');  
  if (!canvas) { 
    console.log('Failed to retrieve the <canvas> element');
    return false; 
  } 

  // Get the rendering context for 2DCG
  var ctx = canvas.getContext('2d');

  // Draw a blue rectangle
  ctx.fillStyle = 'black';                // Set color to black
  ctx.fillRect(0, 0, canvas.width, canvas.height);        // Fill a rectangle with the color
  
  var v1 = new Vector3([2.25, 2.25, 0]);
  drawVector(v1, "red");

}

function drawVector(v, color) {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');
  var scale = 20;

  ctx.beginPath();
  ctx.strokeStyle = color;
  // Center of 400x400 canvas
  ctx.moveTo(200, 200);
  // Flip y so positive is "up"
  ctx.lineTo(200 + v.elements[0] * scale,
             200 - v.elements[1] * scale);
  ctx.stroke();
}

function handleDrawEvent() {
  const canvas = document.getElementById("example");
  const ctx = canvas.getContext("2d");

  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillRect(0, 0, canvas.width, canvas.height);    

  // Read x, y values from the text boxes
  const v1xVal = parseFloat(document.getElementById("v1xValue").value);
  const v1yVal = parseFloat(document.getElementById("v1yValue").value);

  // Create a Vector3 for v1
  const v1 = new Vector3([v1xVal, v1yVal, 0]);

  const v2xVal = parseFloat(document.getElementById("v2xValue").value);
  const v2yVal = parseFloat(document.getElementById("v2yValue").value);

  const v2 = new Vector3([v2xVal, v2yVal, 0]);

  // Draw v1 in red
  drawVector(v1, "red");
  drawVector(v2, "blue"); 
}

function handleDrawOperationEvent() {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');

  // 1) Clear the canvas and fill with black
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2) Read inputs for v1 and v2, then draw them
  var v1x = parseFloat(document.getElementById('v1xValue').value);
  var v1y = parseFloat(document.getElementById('v1yValue').value);
  var v1 = new Vector3([v1x, v1y, 0]);
  drawVector(v1, "red");

  var v2x = parseFloat(document.getElementById('v2xValue').value);
  var v2y = parseFloat(document.getElementById('v2yValue').value);
  var v2 = new Vector3([v2x, v2y, 0]);
  drawVector(v2, "blue");

  // 3) Read the operation and the scalar
  var operation = document.getElementById("operationSelect").value;
  var scalar = parseFloat(document.getElementById("scalarValue").value);

  // 4) Perform the operation and draw the result(s) in green
  if (operation === "add") {
    // v3 = v1 + v2
    var v3 = new Vector3([v1x, v1y, 0]); // copy v1
    v3.add(v2);
    drawVector(v3, "green");

  } else if (operation === "sub") {
    // v3 = v1 - v2
    var v3 = new Vector3([v1x, v1y, 0]); // copy v1
    v3.sub(v2);
    drawVector(v3, "green");

  } else if (operation === "mul") {
    // v3 = v1 * scalar, v4 = v2 * scalar
    var v3 = new Vector3([v1x, v1y, 0]);
    v3.mul(scalar);
    drawVector(v3, "green");

    var v4 = new Vector3([v2x, v2y, 0]);
    v4.mul(scalar);
    drawVector(v4, "green");

  } else if (operation === "div") {
    // v3 = v1 / scalar, v4 = v2 / scalar
    var v3 = new Vector3([v1x, v1y, 0]);
    v3.div(scalar);
    drawVector(v3, "green");

    var v4 = new Vector3([v2x, v2y, 0]);
    v4.div(scalar);
    drawVector(v4, "green");
  } else if (operation === "normalize") {
    // Draw normalized v1 and v2 in green
    var v1Normalized = new Vector3([v1x, v1y, 0]);
    v1Normalized.normalize();
    drawVector(v1Normalized, "green");

    var v2Normalized = new Vector3([v2x, v2y, 0]);
    v2Normalized.normalize();
    drawVector(v2Normalized, "green");
  } else if (operation === "magnitude"){
    console.log("Magnitude of v1:", v1.magnitude());
    console.log("Magnitude of v2:", v2.magnitude());
  } else if (operation === "angle") {
    // Compute angle between v1 and v2
    let angleDeg = angleBetween(v1, v2);
    console.log("Angle between v1 and v2 =", angleDeg, "degrees");
  } else if (operation === "area") {
    // Compute area of triangle formed by v1 and v2
    let area = areaTriangle(v1, v2);
    console.log("Area of triangle formed by v1 and v2 =", area);
  }
}

function angleBetween(v1, v2) {
  let dotVal = Vector3.dot(v1, v2);
  let mag1 = v1.magnitude();
  let mag2 = v2.magnitude();

  // If either vector has zero length, angle is undefined (or 0 by convention)
  if (mag1 === 0 || mag2 === 0) {
    console.warn("Cannot compute angle: one vector is zero-length.");
    return 0;
  }

  // Compute cos(alpha) and clamp to [-1, 1] to avoid floating-point rounding issues
  let cosAlpha = dotVal / (mag1 * mag2);
  cosAlpha = Math.max(-1, Math.min(1, cosAlpha));

  // Convert from radians to degrees
  let alpha = Math.acos(cosAlpha) * (180 / Math.PI);
  return alpha;
}

function areaTriangle(v1, v2) {
  // Cross product gives the area of the parallelogram spanned by v1, v2
  let crossVec = Vector3.cross(v1, v2);
  // Triangle area = 1/2 * parallelogram area
  let area = 0.5 * crossVec.magnitude();
  return area;
}