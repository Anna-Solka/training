import * as THREE from 'three'
import './style.css'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// ---------- SCENE ----------
const scene = new THREE.Scene()
scene.background = new THREE.Color('white')

// ---------- CAMERA ----------
const aspect = window.innerWidth / window.innerHeight
const d = 90

const camera = new THREE.OrthographicCamera(
  -d * aspect,
  d * aspect,
  d,
  -d,
  0.1,
  1000
)

camera.position.set(0, 120, 0)
camera.lookAt(0, 0, 0)

// ---------- RENDERER ----------
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.NoToneMapping

// ---------- CONTROLS ----------
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.maxPolarAngle = Math.PI

// ---------- LIGHT ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.6)) // чуть мягче

// ⭐ ДОБАВИЛИ ОБЪЁМ
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
dirLight.position.set(50, 100, 50)
scene.add(dirLight)

// ---------- DATA ----------
let allWorkouts = []

// ---------- RAYCAST ----------
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

let hoveredCylinder = null
const cylinders = []

// ---------- HTML MONTH BUTTONS ----------
const monthButtons = []

// ---------- HELPERS ----------
function parseNumber(str) {
  return parseFloat(str.replace(',', '.'))
}

function parseDate(dateStr) {
  const [day, month, year] = dateStr.split('.')
  return new Date(`20${year}`, month - 1, day)
}

function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date - start) / (1000 * 60 * 60 * 24))
}

// ---------- TYPES ----------
const typeMap = {
  "Indoor Walk": 0,
  "Elliptical": 1,
  "Stair Climbing": 2,
  "Functional Strength Training": 3
}

const typeNamesRU = [
  "Ходьба",
  "Эллипс",
  "Лестница",
  "Силовые"
]

const TYPE_OFFSET = 4.5
const YEAR_SPACING = 28

// ---------- LEGEND ----------
// ---------- LEGEND ----------
function createLegendHTML() {
  const legend = document.createElement('div')
  legend.className = 'legend'

  legend.innerHTML = `
    <div class="legend-title">ГОДЫ ТРЕНИРОВОК</div>
    <div class="legend-sub">
      Радиальная визуализация всех моих тренировок<br>
      <i>1 цилиндр = 1 тренировка</i>
    </div>
    <ul class="legend-list">
      <li><b>Цвет</b> — тип и интенсивность (чем ярче цвет, тем тренировка интенсивнее)</li>
      <li><b>Диаметр</b> — расход энергии (ккал)</li>
      <li><b>Высота</b> — длительность тренировки</li>
    </ul>
  `
  document.body.appendChild(legend)
}

// ---------- TOOLTIP ----------
const workoutTooltip = document.createElement('div')
workoutTooltip.className = 'workout-tooltip'
document.body.appendChild(workoutTooltip)

// ---------- COLORS ----------
const typeColors = [
  0x6ec5b8,
  0xf7b3cc,
  0xee583f,
  0xc7b65e
]

// ---------- CYLINDERS ----------
function createWorkoutCylinder(workout, minYear) {

  const date = parseDate(workout.Date)
  const minutes = parseNumber(workout.Minutes)
  const energy = parseNumber(workout["Active Energy"])
  const intensity = parseNumber(workout.Intensity)

  if (!minutes || !energy || !intensity) return

  const typeIndex = typeMap[workout["Workout Type"]]
  if (typeIndex === undefined) return

  const day = getDayOfYear(date)
  const angle = (day / 365) * Math.PI * 2

  const yearIndex = date.getFullYear() - minYear
  const baseRadius = (yearIndex + 1) * YEAR_SPACING
  const radius = baseRadius + typeIndex * TYPE_OFFSET

  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius

  const height = minutes * 0.18
  const r = Math.sqrt(energy) * 0.08

  const baseColor = new THREE.Color(typeColors[typeIndex])
  const intensityNorm = (intensity - 3) / 7
  const emissive = baseColor.clone().multiplyScalar(intensityNorm * 0.8)

  const cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, height, 16),
    new THREE.MeshStandardMaterial({
      color: baseColor,
      emissive: emissive,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.95
    })
  )

  cylinder.position.set(x, height / 2, z)

  cylinder.userData = {
    date: workout.Date,
    type: typeNamesRU[typeIndex],
    minutes,
    energy,
    intensity
  }

  scene.add(cylinder)
  cylinders.push(cylinder)
}

// ---------- BASE ----------
function createBaseCircle(radius) {

  const geometry = new THREE.CircleGeometry(radius, 128)

  const material = new THREE.MeshBasicMaterial({
    color: 0xf3e7d7
  })

  const circle = new THREE.Mesh(geometry, material)
  circle.rotation.x = -Math.PI / 2
  circle.position.y = -0.05

  scene.add(circle)
}

// ---------- MONTH LINES ----------
function drawMonthLines(maxRadius) {

  for (let i = 0; i < 12; i++) {

    const angle = (i / 12) * Math.PI * 2

    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(Math.cos(angle)*maxRadius, 0, Math.sin(angle)*maxRadius)
      ]),
      new THREE.LineBasicMaterial({ 
        color: 0xcccccc,      // ⭐ светлее
        transparent: true,
        opacity: 0.5          // ⭐ менее контрастные
      })
    )

    scene.add(line)
  }
}

// ---------- MONTH BUTTONS ----------
function createMonthButtons(maxRadius) {

  const months = [
    "Январь","Февраль","Март","Апрель","Май","Июнь",
    "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"
  ]

  for (let i = 0; i < 12; i++) {

    const angle = (i / 12) * Math.PI * 2
    const x = Math.cos(angle) * (maxRadius + 12)
    const z = Math.sin(angle) * (maxRadius + 12)

    const btn = document.createElement('button')
    btn.innerText = months[i]
    btn.className = 'month-btn'

    document.body.appendChild(btn)

    monthButtons.push({
      el: btn,
      position: new THREE.Vector3(x, 0, z),
      index: i
    })

    btn.onclick = () => showMonthStats(i)
  }
}

// ---------- ANALYTICS ----------
function showMonthStats(monthIndex) {

  const months = [
    "январь","февраль","март","апрель","май","июнь",
    "июль","август","сентябрь","октябрь","ноябрь","декабрь"
  ]

  const stats = {}

  allWorkouts.forEach(w => {

    const d = parseDate(w.Date)
    if (d.getMonth() !== monthIndex) return

    const y = d.getFullYear()

    if (!stats[y]) {
      stats[y] = {
        total: 0,
        types: {
          "Ходьба": {count:0, energy:0, minutes:0, intensity:0},
          "Эллипс": {count:0, energy:0, minutes:0, intensity:0},
          "Лестница": {count:0, energy:0, minutes:0, intensity:0},
          "Силовые": {count:0, energy:0, minutes:0, intensity:0}
        }
      }
    }

    const typeIndex = typeMap[w["Workout Type"]]
    if (typeIndex === undefined) return

    const name = typeNamesRU[typeIndex]

    const energy = parseNumber(w["Active Energy"])
    const minutes = parseNumber(w["Minutes"])
    const intensity = parseNumber(w["Intensity"])

    stats[y].total++

    stats[y].types[name].count++
    stats[y].types[name].energy += energy
    stats[y].types[name].minutes += minutes
    stats[y].types[name].intensity += intensity
  })

  let html = `<b>Статистика за ${months[monthIndex]}</b><br><br>`

  Object.keys(stats).sort().forEach(y => {

    const s = stats[y]

    html += `<b>${y} год</b>: ${s.total} тренировок<br>`

    Object.entries(s.types).forEach(([type, data]) => {

      if (data.count > 0) {

        const avgMinutes = (data.minutes / data.count).toFixed(1)
        const totalEnergy = Math.round(data.energy)
        const avgIntensity = (data.intensity / data.count).toFixed(1)

        // получаем цвет как в сцене
        const typeIndex = typeNamesRU.indexOf(type)
        const colorHex = '#' + typeColors[typeIndex].toString(16).padStart(6, '0')

        html += `
          • <span style="color:${colorHex}; font-weight:bold">${type}</span>: ${data.count}<br>
          &nbsp;&nbsp;Всего ккал: ${totalEnergy}<br>
          &nbsp;&nbsp;Средняя длительность: ${avgMinutes} мин<br>
          &nbsp;&nbsp;Средняя интенсивность: ${avgIntensity}<br>
        `
      }
    })

    html += `<br>`
  })

  workoutTooltip.style.display = 'block'
  workoutTooltip.innerHTML = html
}

// ---------- UPDATE BUTTON POS ----------
function updateButtonsPosition() {

  monthButtons.forEach(b => {

    const pos = b.position.clone()
    pos.project(camera)

    const x = (pos.x * 0.5 + 0.5) * window.innerWidth
    const y = (-pos.y * 0.5 + 0.5) * window.innerHeight

    b.el.style.left = `${x}px`
    b.el.style.top = `${y}px`
  })
}

// ---------- LOAD ----------
fetch('/data/workouts.json')
  .then(res => res.json())
  .then(data => {

    allWorkouts = data

    const dates = data.map(d => parseDate(d.Date))
    const minYear = Math.min(...dates.map(d => d.getFullYear()))
    const maxYear = Math.max(...dates.map(d => d.getFullYear()))

    data.forEach(w => createWorkoutCylinder(w, minYear))

    const maxRadius =
      (maxYear - minYear + 1) * YEAR_SPACING + 4 * TYPE_OFFSET

    createBaseCircle(maxRadius - 1)
    drawMonthLines(maxRadius)
    createMonthButtons(maxRadius)
    createLegendHTML()
  })

// ---------- MOUSE ----------
window.addEventListener('mousemove', e => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
})

// ---------- CLICK CYLINDERS ----------
window.addEventListener('click', () => {

  raycaster.setFromCamera(mouse, camera)
  const i = raycaster.intersectObjects(cylinders)

  if (i.length > 0) {
    const d = i[0].object.userData

    workoutTooltip.style.display = 'block'
    workoutTooltip.innerHTML = `
      <b>${d.type}</b><br>
      ${d.date}<br>
      ${d.minutes} мин<br>
      потраченных ккал: ${d.energy}
    `
  }
})

// ---------- ANIMATE ----------
function animate() {
  requestAnimationFrame(animate)

  raycaster.setFromCamera(mouse, camera)
  const i = raycaster.intersectObjects(cylinders)

  if (i.length > 0) {
    if (hoveredCylinder) hoveredCylinder.scale.set(1,1,1)
    hoveredCylinder = i[0].object
    hoveredCylinder.scale.set(1.3,1.3,1.3)
  } else if (hoveredCylinder) {
    hoveredCylinder.scale.set(1,1,1)
    hoveredCylinder = null
  }

  updateButtonsPosition()

  controls.update()
  renderer.render(scene, camera)
}

animate()

// ---------- RESIZE ----------
window.addEventListener('resize', () => {
  const aspect = window.innerWidth / window.innerHeight

  camera.left = -d * aspect
  camera.right = d * aspect
  camera.top = d
  camera.bottom = -d

  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})