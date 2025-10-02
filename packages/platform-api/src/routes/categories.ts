import { Elysia, t } from 'elysia';
import { CategoryService } from '../services/category-service';
import { 
  createCategorySchema, 
  updateCategorySchema, 
  categoryParamsSchema,
  type CreateCategoryRequest,
  type UpdateCategoryRequest,
  type CategoryParams
} from '../validation/category-validation';

const categoryService = new CategoryService();

export const categoryRoutes = new Elysia({ prefix: '/categories' })
  // Get all categories
  .get('/', async ({ set }) => {
    try {
      const categories = await categoryService.getAllCategories();
      return {
        success: true,
        data: categories,
        meta: {
          total: categories.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch categories',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Get category by ID
  .get('/:id', async ({ params, set }) => {
    try {
      const { id } = categoryParamsSchema.parse(params);
      const category = await categoryService.getCategoryById(id);
      
      return {
        success: true,
        data: category
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Category not found') {
        set.status = 404;
        return {
          success: false,
          message: 'Category not found'
        };
      }
      
      set.status = 500;
      return {
        success: false,
        message: 'Failed to fetch category',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  // Create new category (Admin only)
  .post('/', async ({ body, set }) => {
    try {
      const validatedData = createCategorySchema.parse(body);
      const category = await categoryService.createCategory(validatedData);
      
      set.status = 201;
      return {
        success: true,
        message: 'Category created successfully',
        data: category
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Category with this name already exists') {
        set.status = 409;
        return {
          success: false,
          message: 'Category with this name already exists'
        };
      }
      
      set.status = 500;
      return {
        success: false,
        message: 'Failed to create category',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 100 }),
      description: t.Optional(t.String({ maxLength: 1000 }))
    })
  })

  // Update category (Admin only)
  .put('/:id', async ({ params, body, set }) => {
    try {
      const { id } = categoryParamsSchema.parse(params);
      const validatedData = updateCategorySchema.parse(body);
      
      const category = await categoryService.updateCategory(id, validatedData);
      
      return {
        success: true,
        message: 'Category updated successfully',
        data: category
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Category not found') {
          set.status = 404;
          return {
            success: false,
            message: 'Category not found'
          };
        }
        
        if (error.message === 'Category with this name already exists') {
          set.status = 409;
          return {
            success: false,
            message: 'Category with this name already exists'
          };
        }
      }
      
      set.status = 500;
      return {
        success: false,
        message: 'Failed to update category',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
      description: t.Optional(t.String({ maxLength: 1000 }))
    })
  })

  // Delete category (Admin only)
  .delete('/:id', async ({ params, set }) => {
    try {
      const { id } = categoryParamsSchema.parse(params);
      await categoryService.deleteCategory(id);
      
      set.status = 204;
      return {
        success: true,
        message: 'Category deleted successfully'
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Category not found') {
        set.status = 404;
        return {
          success: false,
          message: 'Category not found'
        };
      }
      
      set.status = 500;
      return {
        success: false,
        message: 'Failed to delete category',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });