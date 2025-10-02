import { CategoryRepository, CreateCategoryData, UpdateCategoryData } from '../repositories/category-repository';

export class CategoryService {
  private categoryRepository: CategoryRepository;

  constructor() {
    this.categoryRepository = new CategoryRepository();
  }

  async getAllCategories() {
    try {
      return await this.categoryRepository.findAll();
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new Error('Failed to fetch categories');
    }
  }

  async getCategoryById(id: number) {
    try {
      const category = await this.categoryRepository.findById(id);
      if (!category) {
        throw new Error('Category not found');
      }
      return category;
    } catch (error) {
      console.error('Error fetching category:', error);
      throw error;
    }
  }

  async createCategory(data: CreateCategoryData) {
    try {
      // Check if category with same name already exists
      const existingCategory = await this.categoryRepository.findByName(data.name);
      if (existingCategory) {
        throw new Error('Category with this name already exists');
      }

      return await this.categoryRepository.create(data);
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  async updateCategory(id: number, data: UpdateCategoryData) {
    try {
      // Check if category exists
      const existingCategory = await this.categoryRepository.findById(id);
      if (!existingCategory) {
        throw new Error('Category not found');
      }

      // Check if new name conflicts with existing categories
      if (data.name && data.name !== existingCategory.name) {
        const nameExists = await this.categoryRepository.nameExists(data.name, id);
        if (nameExists) {
          throw new Error('Category with this name already exists');
        }
      }

      return await this.categoryRepository.update(id, data);
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  async deleteCategory(id: number) {
    try {
      // Check if category exists
      const existingCategory = await this.categoryRepository.findById(id);
      if (!existingCategory) {
        throw new Error('Category not found');
      }

      const deleted = await this.categoryRepository.delete(id);
      if (!deleted) {
        throw new Error('Failed to delete category');
      }

      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }
}