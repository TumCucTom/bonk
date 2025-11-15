// Image file lists for each category
const SENIOR_BOYS = [
  'IMG_9699.jpg',
  'IMG_9700.jpg',
  'IMG_9701.jpg',
  'IMG_9703.jpg',
  'IMG_9706.jpg',
  'IMG_9707.jpg',
  'IMG_9708.jpg',
  'IMG_9727.jpg'
];

const JUNIOR_BOYS = [
  'IMG_9702.jpg',
  'IMG_9704.jpg',
  'IMG_9705.jpg',
  'IMG_9722.jpg',
  'IMG_9726.jpg'
];

const SENIOR_GIRLS = [
  'IMG_9709.jpg',
  'IMG_9710.jpg',
  'IMG_9717.jpg',
  'IMG_9718.jpg',
  'IMG_9721.jpg',
  'IMG_9723.jpg',
  'IMG_9724.jpg'
];

const JUNIOR_GIRLS = [
  'IMG_9711.jpg',
  'IMG_9712.jpg',
  'IMG_9715.jpg',
  'IMG_9716.jpg',
  'IMG_9719.jpg',
  'IMG_9720.jpg',
  'IMG_9725.jpg'
];

export function getImagePath(pieceType: 'kitten' | 'cat', owner: 1 | 2, seed?: number): string {
  let folder: string;
  let files: string[];
  
  if (pieceType === 'cat') {
    // Seniors
    folder = owner === 1 ? 'senior-boys' : 'senior-girls';
    files = owner === 1 ? SENIOR_BOYS : SENIOR_GIRLS;
  } else {
    // Freshers (kittens)
    folder = owner === 1 ? 'junior-boys' : 'junior-girls';
    files = owner === 1 ? JUNIOR_BOYS : JUNIOR_GIRLS;
  }
  
  // Use seed if provided for deterministic selection, otherwise random
  // If seed is provided, use it to consistently select an image
  const fileIndex = seed !== undefined 
    ? seed % files.length 
    : Math.floor(Math.random() * files.length);
  return `/${folder}/${files[fileIndex]}`;
}

