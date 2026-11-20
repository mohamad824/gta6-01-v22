// One job: merge many small meshes that share a material into one draw call.
// Parts are collected per material (a temp mesh's geometry + world matrix), then
// baked into a single non-indexed BufferGeometry per material. Sources are never
// mutated (the merge clones before applying matrices).
import * as THREE from '../vendor/three/three.module.min.js';

/** Merge [{ geo, matrix }] into one non-indexed BufferGeometry. */
export function mergeGeometries(parts) {
  const list = [];
  let count = 0;
  for (const { geo, matrix } of parts) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(matrix);
    count += g.attributes.position.count;
    list.push(g);
  }
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  let o = 0;
  for (const g of list) {
    position.set(g.attributes.position.array, o * 3);
    normal.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(position, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}

/** A bucket: Map<material, parts>. Add a temp mesh (position/rotation set). */
export function bucketAdd(bucket, material, mesh) {
  mesh.updateMatrix();
  if (!bucket.has(material)) bucket.set(material, []);
  bucket.get(material).push({ geo: mesh.geometry, matrix: mesh.matrix.clone() });
}

/** Build one mesh per material in the bucket. `castShadow` marks the shadow casters. */
export function bucketBuild(bucket, shadowMaterials = new Set()) {
  const meshes = [];
  for (const [material, parts] of bucket) {
    const mesh = new THREE.Mesh(mergeGeometries(parts), material);
    mesh.castShadow = shadowMaterials.has(material);
    meshes.push(mesh);
  }
  return meshes;
}
