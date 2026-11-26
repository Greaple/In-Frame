export interface SampleImage {
  name: string;
  url: string;
  format: string;
}

export const SAMPLE_IMAGES: SampleImage[] = [
  {
    name: 'mountain_landscape.jpg',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2400&q=85',
    format: 'image/jpeg',
  },
  {
    name: 'architecture_interior.jpg',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2400&q=85',
    format: 'image/jpeg',
  },
  {
    name: 'portrait_lifestyle.jpg',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=2400&q=85',
    format: 'image/jpeg',
  },
];
