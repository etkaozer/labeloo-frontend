<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
          Annotation Center
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Manage task assignments and track annotation progress
        </p>
        <div class="mt-2 flex items-center space-x-2">
          <!-- Permission Loading Skeleton -->
          <div v-if="permissionsLoading" class="flex items-center space-x-2">
            <div class="animate-pulse flex items-center space-x-2">
              <div class="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div class="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            </div>
          </div>
          
          <!-- Actual Permission Badges -->
          <template v-else>
            <!-- Organization Admin Badge -->
            <UBadge 
              v-if="isOrgAdmin"
              color="warning"
              variant="subtle"
              size="sm"
            >
              <UIcon 
                name="i-heroicons-shield-check" 
                class="w-3 h-3 mr-1"
              />
              Organization Admin (All Projects)
            </UBadge>
            
            <!-- Project Editor Badge -->
            <UBadge 
              v-else-if="userPermissions.canEditProject"
              color="primary"
              variant="subtle"
              size="sm"
            >
              <UIcon 
                name="i-heroicons-pencil-square" 
                class="w-3 h-3 mr-1"
              />
              Project Editor (Can Manage Tasks)
            </UBadge>
            
            <!-- Project Editor Capabilities Badge -->
            <UBadge 
              v-if="userPermissions.canEditProject && !isOrgAdmin && projectEditorCapabilities"
              color="secondary"
              variant="outline"
              size="xs"
            >
              <UIcon 
                name="i-heroicons-check-circle" 
                class="w-2 h-2 mr-1"
              />
              {{ projectEditorCapabilities }}
            </UBadge>
            
            <!-- Team Member Badge -->
            <UBadge 
              v-else
              color="info"
              variant="subtle"
              size="sm"
            >
              <UIcon 
                name="i-heroicons-user" 
                class="w-3 h-3 mr-1"
              />
              Team Member (My Tasks Only)
            </UBadge>
          </template>
        </div>
      </div>      <div class="flex items-center gap-4">
        <!-- Action Buttons Loading Skeleton -->
        <div v-if="permissionsLoading" class="flex items-center gap-4">
          <div class="animate-pulse">
            <div class="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
          </div>
          <div class="animate-pulse">
            <div class="h-9 w-28 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
          </div>
        </div>
        
        <!-- Actual Action Buttons -->
        <template v-else>
          <!-- Assign Button with Progressive Disclosure -->
          <UButton 
            v-if="selectedUnassignedTasks.length > 0"
            @click="canAssignTasks ? assignSelectedTasks() : null" 
            :loading="assignLoading"
            :disabled="!canAssignTasks"
            :title="!canAssignTasks ? 'Requires Project Editor permission - Contact your project administrator' : undefined"
            color="secondary"
            :class="canAssignTasks ? 'cursor-pointer' : 'cursor-not-allowed'"
          >
            <UIcon name="i-heroicons-user-plus" class="w-4 h-4 mr-2" />
            Assign ({{ selectedUnassignedTasks.length }})
          </UButton>        <!-- Complete Button (always available for assigned tasks) -->
        <UButton 
          v-if="selectedAnnotatingTasks.length > 0" 
          @click="completeSelectedTasks" 
          :loading="completeLoading"
          color="success"
          class="cursor-pointer"
        >
          <UIcon name="i-heroicons-check-circle" class="w-4 h-4 mr-2" />
          Complete ({{ selectedAnnotatingTasks.length }})
        </UButton>
        
          <!-- Reassign Button with Progressive Disclosure -->
          <UButton 
            v-if="selectedCompletedTasks.length > 0"
            @click="canAssignTasks ? reassignSelectedTasks() : null"
            :loading="reassignLoading"
            :disabled="!canAssignTasks"
            :title="!canAssignTasks ? 'Requires Project Editor permission - Contact your project administrator' : undefined"
            color="warning"
            :class="canAssignTasks ? 'cursor-pointer' : 'cursor-not-allowed'"
          >
            <UIcon name="i-heroicons-arrow-uturn-left" class="w-4 h-4 mr-2" />
            Reassign ({{ selectedCompletedTasks.length }})
          </UButton>          <!-- Refresh Button (always available) -->
          <UButton @click="refreshTasks" :loading="loading" variant="outline" color="secondary" class="cursor-pointer">
            <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 mr-2" />
            Refresh
          </UButton>
        </template>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p class="text-gray-600 dark:text-gray-400">Loading tasks...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
      <div class="flex items-center">
        <UIcon name="i-heroicons-exclamation-circle" class="w-6 h-6 text-red-600 dark:text-red-400 mr-3" />
        <div>
          <h3 class="text-red-800 dark:text-red-300 font-medium">Error Loading Tasks</h3>
          <p class="text-red-600 dark:text-red-400 text-sm mt-1">{{ error }}</p>
        </div>
      </div>      <UButton @click="refreshTasks" variant="outline" color="error" class="mt-4" size="sm">
        Try Again
      </UButton>
    </div>    <!-- Main Content -->
    <div v-else-if="tasks" class="space-y-6">
      <!-- Task Assignment Slider - Only show to users who can assign tasks -->
      <TaskAssignmentSlider 
        v-if="canAssignTasks && tasks?.unassigned && tasks.unassigned.length > 0"
        :available-tasks="tasks?.unassigned?.length || 0"
        :unassigned-tasks="tasks?.unassigned || []"
        :project-id="projectId"
        @tasks-assigned="handleTasksAssigned"
        @assignment-error="handleAssignmentError"
      />
      
      <!-- Non-editor user message when there are unassigned tasks they can't assign -->
      <div 
        v-else-if="!canAssignTasks && tasks?.unassigned && tasks.unassigned.length > 0" 
        class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6"
      >
        <div class="flex items-center">
          <div class="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
            <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div class="ml-3">
            <h4 class="text-sm font-medium text-blue-900 dark:text-blue-300">
              Task Assignment Restricted
            </h4>
            <p class="text-xs text-blue-700 dark:text-blue-400 mt-1">
              There are {{ tasks?.unassigned?.length || 0 }} unassigned {{ (tasks?.unassigned?.length || 0) === 1 ? 'task' : 'tasks' }} in this project. 
              As a Team Member, you can only work on tasks assigned to you. Contact a Project Editor or Organization Administrator to assign these tasks.
            </p>
          </div>
        </div>
      </div>
      
      <!-- Stats Overview -->
      <div class="space-y-4">
        <!-- Stats Cards Loading Skeleton -->
        <div v-if="permissionsLoading" class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div v-for="n in 3" :key="n" class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 animate-pulse">
            <div class="flex items-center">
              <div class="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                <div class="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>
              <div class="ml-4 space-y-2">
                <div class="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div class="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actual Stats Cards -->
        <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Unassigned Tasks Card -->
          <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
            <div class="flex items-center">
              <div class="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg">
                <UIcon name="i-heroicons-clock" class="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  {{ canViewAllTasks ? 'Unassigned' : 'Available' }}
                </p>
                <p class="text-2xl font-bold text-yellow-900 dark:text-yellow-200">{{ tasks?.unassigned?.length || 0 }}</p>
              </div>
            </div>
          </div>

          <!-- Annotating Tasks Card -->
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <div class="flex items-center">
              <div class="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                <UIcon name="i-heroicons-pencil" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-blue-800 dark:text-blue-300">
                  {{ canViewAllTasks ? 'All Annotating' : 'My Tasks' }}
                </p>
                <p class="text-2xl font-bold text-blue-900 dark:text-blue-200">{{ tasks?.annotating?.length || 0 }}</p>
              </div>
            </div>
          </div>

          <!-- Completed Tasks Card -->
          <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <div class="flex items-center">
              <div class="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                <UIcon name="i-heroicons-check-circle" class="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-green-800 dark:text-green-300">
                  {{ canViewAllTasks ? 'All Completed' : 'My Completed' }}
                </p>
                <p class="text-2xl font-bold text-green-900 dark:text-green-200">{{ tasks?.completed?.length || 0 }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Helper Text for Project Editors -->
        <div 
          v-if="canViewAllTasks && (userPermissions.canEditProject || isOrgAdmin)" 
          class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
        >
          <div class="flex items-center">
            <UIcon name="i-heroicons-eye" class="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
            <p class="text-xs text-blue-700 dark:text-blue-300">
              <span class="font-medium">Enhanced View:</span> You're viewing all tasks in this project due to your {{ isOrgAdmin ? 'Organization Administrator' : 'Project Editor' }} permissions.
            </p>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200 dark:border-gray-700">
        <nav class="-mb-px flex space-x-8">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            :class="[
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer',
              activeTab === tab.key
                ? 'border-secondary text-secondary'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            ]"
          >
            <div class="flex items-center">
              <UIcon :name="tab.icon" class="w-4 h-4 mr-2" />
              {{ tab.label }}
              <span class="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {{ getTaskCount(tab.key) }}
              </span>
            </div>
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="space-y-4">        <!-- Unassigned Tab -->
        <div v-if="activeTab === 'unassigned'">
          <div v-if="!tasks?.unassigned || tasks.unassigned.length === 0" class="text-center py-12">
            <UIcon name="i-heroicons-inbox" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {{ canViewAllTasks ? 'No Unassigned Tasks' : 'No Available Tasks' }}
            </h3>
            <p class="text-gray-500 dark:text-gray-400">
              {{ canViewAllTasks 
                ? 'All tasks have been assigned to team members.' 
                : 'No tasks are currently available for you to work on.' 
              }}
            </p>
          </div>          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div 
              v-for="task in tasks?.unassigned || []" 
              :key="task.id" 
              :class="[
                'border p-4 rounded cursor-pointer transition-all',
                selectedUnassignedTasks.includes(task.id) 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-300 hover:border-blue-300'
              ]"
              @click="toggleUnassignedTaskSelection(task.id)"
            >
              <div class="flex items-start justify-between mb-2">
                <h4 class="font-medium">Task {{ task.id }}</h4>
                <UCheckbox 
                  :model-value="selectedUnassignedTasks.includes(task.id)"
                  @change="toggleUnassignedTaskSelection(task.id)"
                  @click.stop
                />
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Status: {{ task.status }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Type: {{ task.dataType }}</p>
              <img v-if="task.dataType.includes('image')" :src="getTaskImageUrl(task)" class="w-full h-32 object-cover mt-2 rounded" />
            </div>
          </div>
        </div>        <!-- Annotating Tab -->
        <div v-if="activeTab === 'annotating'">
          <div v-if="!tasks?.annotating || tasks.annotating.length === 0" class="text-center py-12">
            <UIcon name="i-heroicons-pencil" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {{ canViewAllTasks ? 'No Tasks in Progress' : 'No Tasks Assigned to You' }}
            </h3>
            <p class="text-gray-500 dark:text-gray-400">
              {{ canViewAllTasks 
                ? 'No tasks are currently being annotated by any team member.' 
                : 'You have no tasks assigned to you for annotation.' 
              }}
            </p>
          </div>          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div 
              v-for="task in tasks?.annotating || []" 
              :key="task.id" 
              :class="[
                'border p-4 rounded cursor-pointer transition-all relative',
                selectedAnnotatingTasks.includes(task.id)
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-blue-500 hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              ]"
              @click="toggleAnnotatingTaskSelection(task.id)"
            >
              <div class="flex items-start justify-between mb-2">
                <h4 class="font-medium">Task {{ task.id }}</h4>
                <UCheckbox 
                  :model-value="selectedAnnotatingTasks.includes(task.id)"
                  @change="toggleAnnotatingTaskSelection(task.id)"
                  @click.stop
                  class="cursor-pointer"
                />
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Status: {{ task.status }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Type: {{ task.dataType }}</p>
              <img v-if="task.dataType.includes('image')" :src="getTaskImageUrl(task)" class="w-full h-32 object-cover mt-2 rounded" />
              
              <!-- Action Buttons Section -->
              <div class="mt-3 space-y-2 flex flex-col items-center">
                <UButton
                  @click.stop="navigateToAnnotate(task.id)"
                  size="lg"
                  variant="solid"
                  color="secondary"
                  class="rounded-full px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 cursor-pointer text-black dark:text-black"
                >
                  <UIcon name="i-heroicons-pencil" class="w-5 h-5 mr-2" />
                  Continue Annotation
                </UButton>
                
                <div v-if="!selectedAnnotatingTasks.includes(task.id)" class="flex items-center text-xs text-blue-600 dark:text-blue-400">
                  <UIcon name="i-heroicons-information-circle" class="w-3 h-3 mr-1" />
                  Click card to select for completion
                </div>
                <div v-else class="flex items-center text-xs text-green-600 dark:text-green-400">
                  <UIcon name="i-heroicons-check-circle" class="w-3 h-3 mr-1" />
                  Selected for completion
                </div>
              </div>      
            </div>
          </div>
        </div>

        <!-- Completed Tab -->
        <div v-if="activeTab === 'completed'">
          <!-- Header -->
          <div v-if="tasks?.completed && tasks.completed.length > 0" class="mb-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Completed Tasks ({{ tasks?.completed?.length || 0 }})
            </h3>
            
            <!-- Export Configuration Section -->
            <div :class="[
              'border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6',
              canExportDataset 
                ? 'bg-white dark:bg-gray-800' 
                : 'bg-gray-50 dark:bg-gray-800/50'
            ]">
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <UIcon name="i-heroicons-arrow-down-tray" class="w-5 h-5 mr-2" />
                  Export Dataset Configuration
                </h4>
                
                <!-- Permission Status Indicator -->
                <UBadge 
                  :color="canExportDataset ? 'success' : 'warning'"
                  variant="subtle"
                  size="xs"
                >
                  <UIcon 
                    :name="canExportDataset ? 'i-heroicons-check-circle' : 'i-heroicons-lock-closed'" 
                    class="w-3 h-3 mr-1"
                  />
                  {{ canExportDataset ? 'Available' : 'Permission Required' }}
                </UBadge>
              </div>
              
              <!-- Export Format Selection -->
              <div class="mb-6">
                <h5 class="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Export Format
                </h5>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label class="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input 
                      type="radio" 
                      name="exportFormat"
                      v-model="selectedExportFormat" 
                      value="yolo"
                      class="text-primary focus:ring-primary"
                    >
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white">YOLO Format</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        Standard YOLO annotation format with normalized coordinates
                      </p>
                    </div>
                  </label>
                  
                  <label class="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input 
                      type="radio" 
                      name="exportFormat"
                      v-model="selectedExportFormat" 
                      value="coco"
                      class="text-primary focus:ring-primary"
                    >
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white">COCO Format</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        COCO JSON format for object detection and instance segmentation
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Dataset Split Configuration -->
              <div class="mb-6">
                <h5 class="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Dataset Split Configuration
                </h5>
                <div class="space-y-4">
                  <div class="grid grid-cols-3 gap-4">
                    <!-- Train Split -->
                    <div>
                      <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Train (%)
                      </label>
                      <input 
                        type="number"
                        v-model.number="trainPercentage"
                        min="0"
                        max="100"
                        @input="updateSplitPercentages('train')"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    
                    <!-- Test Split -->
                    <div>
                      <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Test (%)
                      </label>
                      <input 
                        type="number"
                        v-model.number="testPercentage"
                        min="0"
                        max="100"
                        @input="updateSplitPercentages('test')"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    
                    <!-- Validation Split -->
                    <div>
                      <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Validation (%)
                      </label>
                      <input 
                        type="number"
                        v-model.number="validationPercentage"
                        min="0"
                        max="100"
                        @input="updateSplitPercentages('validation')"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <!-- Visual Progress Bars -->
                  <div class="space-y-2">
                    <div class="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>Split Distribution</span>
                      <span class="font-medium" :class="totalPercentage === 100 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                        Total: {{ totalPercentage }}%
                      </span>
                    </div>
                    <div class="flex rounded-lg overflow-hidden h-2">
                      <div 
                        class="bg-blue-500 transition-all duration-200" 
                        :style="{ width: `${trainPercentage}%` }"
                        :title="`Train: ${trainPercentage}%`"
                      ></div>
                      <div 
                        class="bg-green-500 transition-all duration-200" 
                        :style="{ width: `${testPercentage}%` }"
                        :title="`Test: ${testPercentage}%`"
                      ></div>
                      <div 
                        class="bg-yellow-500 transition-all duration-200" 
                        :style="{ width: `${validationPercentage}%` }"
                        :title="`Validation: ${validationPercentage}%`"
                      ></div>
                    </div>
                    <div class="flex justify-between text-xs">
                      <span class="flex items-center">
                        <div class="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                        Train ({{ Math.round((tasks?.completed?.length || 0) * trainPercentage / 100) }} tasks)
                      </span>
                      <span class="flex items-center">
                        <div class="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                        Test ({{ Math.round((tasks?.completed?.length || 0) * testPercentage / 100) }} tasks)
                      </span>
                      <span class="flex items-center">
                        <div class="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                        Validation ({{ Math.round((tasks?.completed?.length || 0) * validationPercentage / 100) }} tasks)
                      </span>
                    </div>
                  </div>
                  
                  <!-- Warning for invalid split -->
                  <div v-if="totalPercentage !== 100" class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <div class="flex items-start">
                      <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 mr-2" />
                      <div>
                        <p class="text-xs font-medium text-amber-800 dark:text-amber-300">Invalid Split</p>
                        <p class="text-xs text-amber-700 dark:text-amber-400 mt-1">
                          Percentages must total exactly 100%. Current total: {{ totalPercentage }}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Export Information -->
              <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <div class="flex items-start">
                  <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" />
                  <div>
                    <h6 class="text-sm font-medium text-blue-900 dark:text-blue-300">Export Information</h6>
                    <p class="text-sm text-blue-700 dark:text-blue-400 mt-1">
                      This will export {{ tasks?.completed?.length || 0 }} completed tasks with their annotations.
                    </p>
                    <p class="text-xs text-blue-600 dark:text-blue-300 mt-2">
                      • Only the latest annotation per task will be exported<br>
                      • Duplicate annotations will be automatically removed<br>
                      • Annotations will be validated before export
                    </p>
                  </div>
                </div>
              </div>

              <!-- Export Button -->
              <div class="flex justify-between items-center">
                <UButton 
                  @click="checkAnnotationStatus"
                  :loading="checkingAnnotations"
                  variant="outline"
                  color="neutral"
                  size="md"
                >
                  <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 mr-2" />
                  Check Annotations
                </UButton>
                
                <!-- Export Button with Progressive Disclosure -->
                <UButton 
                  @click="canExportDataset ? handleExportDataset() : null"
                  :loading="exportLoading"
                  :disabled="!canExportDataset || !selectedExportFormat || totalPercentage !== 100"
                  :title="!canExportDataset ? 'Requires Project Editor or Organization Administrator permissions - Contact your project administrator' : (!selectedExportFormat || totalPercentage !== 100) ? 'Complete configuration to export' : undefined"
                  color="primary"
                  size="lg"
                  :class="canExportDataset ? 'cursor-pointer' : 'cursor-not-allowed'"
                >
                  <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4 mr-2" />
                  Export Dataset
                </UButton>
              </div>
            </div>
          </div>
          
          <!-- Completed Tasks Grid -->
          <div v-if="!tasks?.completed || tasks.completed.length === 0" class="text-center py-12">
            <UIcon name="i-heroicons-check-circle" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {{ canViewAllTasks ? 'No Completed Tasks' : 'No Completed Tasks' }}
            </h3>
            <p class="text-gray-500 dark:text-gray-400">
              {{ canViewAllTasks 
                ? 'No tasks have been completed by any team member yet.' 
                : 'You have not completed any tasks yet.' 
              }}
            </p>
          </div>
          
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div 
              v-for="task in tasks?.completed || []" 
              :key="task.id" 
              :class="[
                'border p-4 rounded cursor-pointer transition-all',
                selectedCompletedTasks.includes(task.id) 
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                  : 'border-purple-300 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
              ]"
              @click="toggleCompletedTaskSelection(task.id)"
            >
              <div class="flex items-start justify-between mb-2">
                <h4 class="font-medium">Task {{ task.id }}</h4>
                <UCheckbox 
                  :model-value="selectedCompletedTasks.includes(task.id)"
                  @click.stop
                  class="cursor-pointer"
                />
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Status: {{ task.status }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Type: {{ task.dataType }}</p>
              <img v-if="task.dataType.includes('image')" :src="getTaskImageUrl(task)" class="w-full h-32 object-cover mt-2 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'
import TaskAssignmentSlider from '~/components/project/TaskAssignmentSlider.vue'
import { useImageUrl } from '~/composables/useImageUrl'

const { getTaskImageUrl } = useImageUrl()

interface Task {
  id: number
  projectId: number
  dataUrl: string
  dataType: string
  status: 'unassigned' | 'annotating' | 'completed'
  assignedTo: number | null
  metadata: string
  priority: number
  createdAt: number
  updatedAt: number
}

interface UserPermissions {
  isOrgAdmin: boolean
  canEditProject: boolean
  canAssignTasks: boolean
  canViewAllTasks: boolean
  canExportDataset: boolean
}

interface TasksResponse {
  data: Task[] // API returns a flat array of tasks
  permissions?: UserPermissions
}

interface ProjectData {
  id: number
  name: string
  description?: string
  projectType: number
  labelConfig?: {
    classes: string[]
  }
  organizationId: number
  createdAt: number
  updatedAt: number
}

interface ProjectResponse {
  data: {
    projects: ProjectData
    project_relations: any
  }
}

// Props
const props = defineProps<{
  projectId: string
}>()

// Reactive state
const loading = ref(false)
const permissionsLoading = ref(false)
const error = ref<string | null>(null)
const tasks = ref<{
  unassigned: Task[]
  annotating: Task[]
  completed: Task[]
} | null>(null)
const activeTab = ref<'unassigned' | 'annotating' | 'completed'>('unassigned')
const userPermissions = ref<UserPermissions>({
  isOrgAdmin: false,
  canEditProject: false,
  canAssignTasks: false,
  canViewAllTasks: false,
  canExportDataset: false
})
const organizationId = ref<number | null>(null)
const selectedUnassignedTasks = ref<number[]>([])
const selectedAnnotatingTasks = ref<number[]>([])
const selectedCompletedTasks = ref<number[]>([])
const assignLoading = ref(false)
const completeLoading = ref(false)
const reassignLoading = ref(false)

// Export functionality
const selectedExportFormat = ref('yolo')
const exportLoading = ref(false)
const checkingAnnotations = ref(false)

// Dataset split percentages
const trainPercentage = ref(80)
const testPercentage = ref(10)
const validationPercentage = ref(10)

// Computed property for total percentage
const totalPercentage = computed(() => 
  trainPercentage.value + testPercentage.value + validationPercentage.value
)

// Computed properties for permission checks
const canAssignTasks = computed(() => userPermissions.value.canAssignTasks)
const canExportDataset = computed(() => userPermissions.value.canExportDataset)
const canViewAllTasks = computed(() => userPermissions.value.canViewAllTasks)
const isOrgAdmin = computed(() => userPermissions.value.isOrgAdmin)

const permissionLevelLabel = computed(() => {
  if (userPermissions.value.isOrgAdmin) {
    return 'Organization Administrator'
  } else if (userPermissions.value.canEditProject) {
    return 'Project Editor'
  } else {
    return 'Team Member'
  }
})

const projectEditorCapabilities = computed(() => {
  if (!userPermissions.value.canEditProject || userPermissions.value.isOrgAdmin) {
    return ''
  }
  
  const capabilities = []
  if (userPermissions.value.canAssignTasks) capabilities.push('Can assign')
  if (userPermissions.value.canViewAllTasks) capabilities.push('Can view all')
  if (userPermissions.value.canExportDataset) capabilities.push('Can export')
  
  return capabilities.join(' • ')
})

// Tab configuration
const tabs = computed(() => [
  {
    key: 'unassigned' as const,
    label: canViewAllTasks.value ? 'Unassigned' : 'Available',
    icon: 'i-heroicons-clock'
  },
  {
    key: 'annotating' as const,
    label: canViewAllTasks.value ? 'All Annotating' : 'My Tasks',
    icon: 'i-heroicons-pencil'
  },
  {
    key: 'completed' as const,
    label: canViewAllTasks.value ? 'All Completed' : 'My Completed',
    icon: 'i-heroicons-check-circle'
  }
])

// Computed
const getTaskCount = (tabKey: string) => {
  if (!tasks.value) return 0
  const taskArray = tasks.value[tabKey as keyof typeof tasks.value]
  return Array.isArray(taskArray) ? taskArray.length : 0
}

// Auth
const { isAuthenticated } = useAuth()
const token = useCookie('auth_token')
const toast = useToast()

// Methods
// Context-aware error message generator
const getContextualErrorMessage = (error: Error, actionType: 'assign' | 'complete' | 'reassign' | 'export') => {
  const errorMessage = error.message.toLowerCase()
  
  // Handle 403 Forbidden errors with context
  if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
    const currentRole = userPermissions.value.isOrgAdmin 
      ? 'Organization Administrator'
      : userPermissions.value.canEditProject 
        ? 'Project Editor' 
        : 'Team Member'
    
    switch (actionType) {
      case 'assign':
      case 'reassign':
        if (userPermissions.value.isOrgAdmin) {
          return 'Unexpected permission error: As an Organization Administrator, you should have access to task assignment. Please contact support.'
        } else if (userPermissions.value.canEditProject) {
          return 'Permission denied: Your Project Editor role should allow task assignment. Your permissions may have been changed - please refresh the page or contact your administrator.'
        } else {
          return 'Permission denied: Task assignment requires Project Editor or Organization Administrator permissions. Contact your project administrator to request elevated access.'
        }
      
      case 'export':
        if (userPermissions.value.isOrgAdmin) {
          return 'Unexpected permission error: As an Organization Administrator, you should have access to dataset export. Please contact support.'
        } else if (userPermissions.value.canExportDataset) {
          return 'Permission denied: Your export permission may have been revoked. Please refresh the page or contact your administrator.'
        } else {
          return 'Permission denied: Dataset export requires Project Editor or Organization Administrator permissions. Contact your project administrator to request export access.'
        }
      
      case 'complete':
        return 'Permission denied: You can only complete tasks assigned to you. This task may have been reassigned to another user.'
      
      default:
        return `Permission denied: Your current role (${currentRole}) does not have sufficient permissions for this action. Contact your project administrator.`
    }
  }
  
  // Handle 401 Unauthorized errors
  if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
    return 'Authentication expired: Please log in again to continue working with tasks.'
  }
  
  // Handle 404 Not Found errors
  if (errorMessage.includes('404') || errorMessage.includes('not found')) {
    return 'Resource not found: The task or project may have been deleted. Please refresh the page.'
  }
  
  // Handle 500 Server errors
  if (errorMessage.includes('500') || errorMessage.includes('server error')) {
    return 'Server error: There was a problem processing your request. Please try again later or contact support.'
  }
  
  // Default fallback with action context
  const actionDescriptions = {
    assign: 'assign tasks',
    complete: 'complete tasks',
    reassign: 'reassign tasks',
    export: 'export dataset'
  }
  
  return `Failed to ${actionDescriptions[actionType]}: ${error.message || 'Unknown error occurred'}. Please try again.`
}

// Fetch project data to get organization ID
const fetchProjectData = async () => {
  if (!token.value || !props.projectId) return

  try {
    const response = await $fetch<ProjectResponse>(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/projects/${props.projectId}`, {
      headers: {
        'Authorization': `Bearer ${token.value}`
      }
    })

    if (response?.data?.projects?.organizationId) {
      organizationId.value = response.data.projects.organizationId
      console.log('Project organizationId:', organizationId.value)
    }
  } catch (error) {
    console.error('Error fetching project data:', error)
  }
}

const fetchTasks = async () => {
  try {
    loading.value = true
    permissionsLoading.value = true
    error.value = null
    
    if (!token.value) {
      throw new Error('Authentication required')
    }
    
    // Ensure we have organizationId before fetching tasks
    if (!organizationId.value) {
      await fetchProjectData()
    }
    
    console.log('Fetching user tasks for project:', props.projectId, 'organization:', organizationId.value)
    console.log('Using token:', token.value ? 'Token exists' : 'No token')
    
    // Build query parameters
    const queryParams = new URLSearchParams()
    if (props.projectId) {
      queryParams.append('projectId', props.projectId)
    }
    if (organizationId.value) {
      queryParams.append('organizationId', organizationId.value.toString())
    }
    
    const url = `${import.meta.env.NUXT_PUBLIC_API_URL}/api/tasks/my-tasks${queryParams.toString() ? '?' + queryParams.toString() : ''}`
    console.log('Fetching from URL:', url)
    
    const response = await $fetch<TasksResponse>(url, {
      headers: {
        'Authorization': `Bearer ${token.value}`
      }
    })
    
    console.log('My Tasks API Response:', response)
    console.log('Raw response.permissions:', response.permissions)
    
    // The API returns a flat array of tasks, we need to organize them by status
    const taskArray = Array.isArray(response.data) ? response.data : []
    console.log('Task array received:', taskArray)
    
    // Organize tasks by status
    const organizedTasks = {
      unassigned: taskArray.filter(task => task.status === 'unassigned'),
      annotating: taskArray.filter(task => task.status === 'annotating'),
      completed: taskArray.filter(task => task.status === 'completed')
    }
    
    console.log('Organized tasks:', organizedTasks)
    tasks.value = organizedTasks
    
    // Update user permissions with comprehensive permission object
    if (response.permissions) {
      userPermissions.value = {
        isOrgAdmin: response.permissions.isOrgAdmin || false,
        canEditProject: response.permissions.canEditProject || false,
        canAssignTasks: response.permissions.canAssignTasks || false,
        canViewAllTasks: response.permissions.canViewAllTasks || false,
        canExportDataset: response.permissions.canExportDataset || false
      }
      console.log('User permissions updated:', userPermissions.value)
    } else {
      // Fallback for backwards compatibility - reset to default permissions
      userPermissions.value = {
        isOrgAdmin: false,
        canEditProject: false,
        canAssignTasks: false,
        canViewAllTasks: false,
        canExportDataset: false
      }
      console.log('No permissions in response, using default permissions')
    }
    
    console.log('Tasks set to:', tasks.value)
    console.log('Final user permissions:', userPermissions.value)
    console.log('Permission level label:', permissionLevelLabel.value)
    
  } catch (err) {
    console.error('Error fetching tasks:', err)
    
    // Enhanced error handling for permission-specific messages
    let errorMessage = 'Failed to fetch tasks'
    
    if (err instanceof Error) {
      // Check for 403 Forbidden errors
      if (err.message.includes('403') || err.message.toLowerCase().includes('forbidden')) {
        errorMessage = 'Access denied: You do not have permission to view tasks in this project. Please contact your project administrator.'
      } else if (err.message.includes('401') || err.message.toLowerCase().includes('unauthorized')) {
        errorMessage = 'Authentication required: Please log in again to access project tasks.'
      } else if (err.message.includes('404') || err.message.toLowerCase().includes('not found')) {
        errorMessage = 'Project not found: This project may have been deleted or you may not have access to it.'
      } else {
        errorMessage = err.message
      }
    }
    
    error.value = errorMessage
  } finally {
    loading.value = false
    permissionsLoading.value = false
  }
}

const refreshTasks = () => {
  fetchTasks()
}

// Task selection methods
const toggleUnassignedTaskSelection = (taskId: number) => {
  const index = selectedUnassignedTasks.value.indexOf(taskId)
  if (index > -1) {
    selectedUnassignedTasks.value.splice(index, 1)
  } else {
    selectedUnassignedTasks.value.push(taskId)
  }
}

const toggleAnnotatingTaskSelection = (taskId: number) => {
  const index = selectedAnnotatingTasks.value.indexOf(taskId)
  if (index > -1) {
    selectedAnnotatingTasks.value.splice(index, 1)
  } else {
    selectedAnnotatingTasks.value.push(taskId)
  }
}

const toggleCompletedTaskSelection = (taskId: number) => {
  const index = selectedCompletedTasks.value.indexOf(taskId)
  if (index > -1) {
    selectedCompletedTasks.value.splice(index, 1)
  } else {
    selectedCompletedTasks.value.push(taskId)
  }
}

const assignSelectedTasks = async () => {
  if (selectedUnassignedTasks.value.length === 0) return
  
  try {
    assignLoading.value = true
    
    if (!token.value) {
      throw new Error('Authentication required')
    }
    
    const response = await $fetch(import.meta.env.NUXT_PUBLIC_API_URL + '/api/tasks/update', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json'
      },
      body: {
        taskId: selectedUnassignedTasks.value,
        status: 'annotating'
      }
    })
      console.log('Tasks assigned successfully:', response)
    
    // Show success toast
    toast.add({
      title: 'Tasks Assigned',
      description: `${selectedUnassignedTasks.value.length} task(s) assigned successfully`,
      color: 'success'
    })
    
    // Clear selection and refresh tasks
    selectedUnassignedTasks.value = []
    await fetchTasks()
      } catch (err) {
    console.error('Error assigning tasks:', err)
    
    const errorMessage = err instanceof Error 
      ? getContextualErrorMessage(err, 'assign')
      : 'Failed to assign tasks: Unknown error occurred'
    
    error.value = errorMessage
    
    // Show error toast
    toast.add({
      title: 'Assignment Failed',
      description: errorMessage,
      color: 'error'
    })
  } finally {
    assignLoading.value = false
  }
}

const completeSelectedTasks = async () => {
  if (selectedAnnotatingTasks.value.length === 0) return
  
  try {
    completeLoading.value = true
    
    if (!token.value) {
      throw new Error('Authentication required')
    }
    
    const response = await $fetch(import.meta.env.NUXT_PUBLIC_API_URL + '/api/tasks/update', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json'
      },
      body: {
        taskId: selectedAnnotatingTasks.value,
        status: 'completed'
      }
    })
      console.log('Tasks completed successfully:', response)
    
    // Show success toast
    toast.add({
      title: 'Tasks Completed',
      description: `${selectedAnnotatingTasks.value.length} task(s) completed successfully`,
      color: 'success'
    })
    
    // Clear selection and refresh tasks
    selectedAnnotatingTasks.value = []
    await fetchTasks()
      } catch (err) {
    console.error('Error completing tasks:', err)
    
    const errorMessage = err instanceof Error 
      ? getContextualErrorMessage(err, 'complete')
      : 'Failed to complete tasks: Unknown error occurred'
    
    error.value = errorMessage
    
    // Show error toast
    toast.add({
      title: 'Completion Failed',
      description: errorMessage,
      color: 'error'
    })
  } finally {
    completeLoading.value = false
  }
}

const reassignSelectedTasks = async () => {
  if (selectedCompletedTasks.value.length === 0) return
  
  try {
    reassignLoading.value = true
    
    if (!token.value) {
      throw new Error('Authentication required')
    }
    
    const response = await $fetch(import.meta.env.NUXT_PUBLIC_API_URL + '/api/tasks/update', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json'
      },
      body: {
        taskId: selectedCompletedTasks.value,
        status: 'annotating'
      }
    })
    
    console.log('Tasks reassigned successfully:', response)
    
    // Show success toast
    toast.add({
      title: 'Tasks Reassigned',
      description: `${selectedCompletedTasks.value.length} task(s) reassigned to annotation successfully`,
      color: 'success'
    })
    
    // Clear selection and refresh tasks
    selectedCompletedTasks.value = []
    await fetchTasks()
    
  } catch (err) {
    console.error('Error reassigning tasks:', err)
    
    const errorMessage = err instanceof Error 
      ? getContextualErrorMessage(err, 'reassign')
      : 'Failed to reassign tasks: Unknown error occurred'
    
    error.value = errorMessage
    
    // Show error toast
    toast.add({
      title: 'Reassignment Failed',
      description: errorMessage,
      color: 'error'
    })
  } finally {
    reassignLoading.value = false
  }
}

// Task actions
const { assignToSelf } = useTaskActions()

const handleAssignTask = async (task: Task) => {
  try {
    const res = await assignToSelf(task.id)
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string }
      throw new Error(body.error || `Failed to assign task (${res.status})`)
    }
    toast.add({
      title: 'Task Assigned',
      description: `Task #${task.id} is now assigned to you`,
      color: 'success'
    })
    await fetchTasks()
  } catch (err) {
    toast.add({
      title: 'Assignment Failed',
      description: err instanceof Error ? err.message : 'Failed to assign task',
      color: 'error'
    })
  }
}

// Viewing, continuing and reviewing a task all open it in the annotation
// workspace, which loads the task data and any existing annotations.
const handleViewTask = (task: Task) => navigateToAnnotate(task.id)
const handleContinueTask = (task: Task) => navigateToAnnotate(task.id)
const handleReviewTask = (task: Task) => navigateToAnnotate(task.id)

// Bulk task assignment handlers
const handleTasksAssigned = async (taskIds: number[]) => {
  console.log('Tasks assigned successfully:', taskIds)
  
  // Show success notification
  toast.add({
    title: 'Tasks Assigned Successfully',
    description: `${taskIds.length} ${taskIds.length === 1 ? 'task' : 'tasks'} assigned to you`,
    color: 'success'
  })
  
  // Refresh the tasks to update the UI
  await fetchTasks()
}

const handleAssignmentError = (errorMessage: string) => {
  console.error('Task assignment error:', errorMessage)
  
  // Show error notification
  toast.add({
    title: 'Assignment Failed',
    description: errorMessage,
    color: 'error'
  })
}

const navigateToAnnotate = (taskId: number) => {
  const router = useRouter()
  router.push(`/annotate/${taskId}`)
}

// Export functionality
const handleExportDataset = async () => {
  try {
    exportLoading.value = true
    
    if (!token.value) {
      throw new Error('Authentication required')
    }
    
    console.log('Exporting dataset for project:', props.projectId)
    console.log('Export format:', selectedExportFormat.value)
    console.log('Split configuration:', {
      train: trainPercentage.value,
      test: testPercentage.value,
      validation: validationPercentage.value
    })
    
    // Validate that we have completed tasks to export
    if (!tasks.value?.completed || tasks.value.completed.length === 0) {
      throw new Error('No completed tasks available for export')
    }
    
    // Log export request details for debugging
    console.log('Export request details:', {
      projectId: props.projectId,
      exportFormat: selectedExportFormat.value,
      completedTasks: tasks.value.completed.length,
      splitConfig: {
        train: trainPercentage.value,
        test: testPercentage.value,
        validation: validationPercentage.value,
        total: totalPercentage.value
      },
      taskDetails: tasks.value.completed.map(task => ({
        id: task.id,
        dataType: task.dataType,
        hasImage: task.dataType.includes('image'),
        metadata: task.metadata ? 'Has metadata' : 'No metadata'
      }))
    })

    // Validate split configuration before sending
    const actualTrainCount = Math.round(tasks.value.completed.length * trainPercentage.value / 100)
    const actualTestCount = Math.round(tasks.value.completed.length * testPercentage.value / 100)
    const actualValidationCount = Math.round(tasks.value.completed.length * validationPercentage.value / 100)
    
    console.log('Expected split distribution:', {
      total: tasks.value.completed.length,
      train: actualTrainCount,
      test: actualTestCount,
      validation: actualValidationCount,
      sum: actualTrainCount + actualTestCount + actualValidationCount
    })
    
    // Enhanced debugging request to check annotation data flow
    const requestBody = {
      exportFormat: selectedExportFormat.value,
      splitConfig: {
        train: trainPercentage.value,
        test: testPercentage.value,
        validation: validationPercentage.value
      },
      options: {
        onlyLatestAnnotations: true, // Only export the latest annotation per task
        deduplicateAnnotations: true, // Remove duplicate annotations
        validateAnnotations: true, // Validate annotation data before export
        validateCoordinates: true, // Validate YOLO coordinate ranges
        debugMode: true, // Enable debug logging on backend
        ensureProperSplit: true, // Ensure proper task splitting
        validateImageDimensions: true, // Validate image dimensions
        // Add annotation inspection options
        inspectDatabase: true, // Log database queries and results
        inspectAnnotationData: true, // Log annotation data details
        inspectTaskMetadata: true, // Log task metadata
        debugFileGeneration: true, // Debug file writing process
        verifyAnnotationCount: true, // Verify annotation counts per task
        logEmptyTasks: true // Log tasks with no annotations
      }
    }
    
    console.log('Full request payload:', JSON.stringify(requestBody, null, 2))
    
    const response = await fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/tasks/export/${props.projectId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json',
        'export-format': selectedExportFormat.value
      },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Export failed' }))
      console.error('Export API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        requestBody: {
          exportFormat: selectedExportFormat.value,
          splitConfig: {
            train: trainPercentage.value,
            test: testPercentage.value,
            validation: validationPercentage.value
          }
        }
      })
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }
    
    // Check if response is a ZIP file
    const contentType = response.headers.get('content-type')
    console.log('Response content type:', contentType)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    if (contentType && contentType.includes('application/zip')) {
      // Handle ZIP file download
      const blob = await response.blob()
      console.log('Export blob details:', {
        size: blob.size,
        type: blob.type,
        sizeInKB: (blob.size / 1024).toFixed(2)
      })
      
      if (blob.size === 0) {
        throw new Error('Export file is empty - no annotation data found. Please check if tasks have valid annotations.')
      }
      
      // Warn if blob is very small (likely just folder structure without annotations)
      if (blob.size < 2048) { // Less than 2KB
        console.warn(`Export file is very small (${blob.size} bytes). This may indicate empty label files.`)
        toast.add({
          title: 'Warning: Small Export File',
          description: `Export file is only ${(blob.size / 1024).toFixed(1)} KB. Label files may be empty.`,
          color: 'warning'
        })
      }
      
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      
      // Create more descriptive filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0]
      link.download = `project-${props.projectId}-${selectedExportFormat.value}-${timestamp}.zip`
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      // Show detailed success toast
      toast.add({
        title: 'Dataset Downloaded',
        description: `${selectedExportFormat.value.toUpperCase()} dataset (${(blob.size / 1024).toFixed(1)} KB) with ${trainPercentage.value}%/${testPercentage.value}%/${validationPercentage.value}% split`,
        color: 'success'
      })
    } else {
      // Handle JSON response (fallback)
      const data = await response.json()
      console.log('Export response:', data)
      
      const dataStr = JSON.stringify(data, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `dataset_${props.projectId}_${selectedExportFormat.value}_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.add({
        title: 'Dataset Exported',
        description: `Dataset exported successfully as JSON`,
        color: 'success'
      })
    }
    
    // Close modal after successful export (now just a success message)
    toast.add({
      title: 'Export Complete',
      description: 'Dataset export completed successfully.',
      color: 'success'
    })
    
  } catch (err) {
    console.error('Error exporting dataset:', err)
    
    let errorMessage = 'Failed to export dataset'
    
    if (err instanceof Error) {
      // Handle special export-specific errors first
      if (err.message.includes('No completed tasks')) {
        errorMessage = 'No completed tasks available for export. Complete some tasks first.'
      } else {
        // Use contextual error handling for permission and general errors
        errorMessage = getContextualErrorMessage(err, 'export')
      }
    }
    
    // Show error toast
    toast.add({
      title: 'Export Failed',
      description: errorMessage,
      color: 'error'
    })
  } finally {
    exportLoading.value = false
  }
}

// Check annotation status for completed tasks
const checkAnnotationStatus = async () => {
  if (!tasks.value?.completed || !tasks.value.completed.length) {
    toast.add({
      title: 'No Completed Tasks',
      description: 'There are no completed tasks to check for annotations.',
      color: 'warning'
    })
    return
  }

  try {
    checkingAnnotations.value = true
    
    if (!token.value) {
      throw new Error('Authentication required')
    }

    console.log('Checking annotation status for completed tasks:', tasks.value.completed.map(t => t.id))

    const response = await $fetch(`${import.meta.env.NUXT_PUBLIC_API_URL}/api/tasks/annotation-status/${props.projectId}`, {
      headers: {
        'Authorization': `Bearer ${token.value}`
      }
    })

    console.log('Annotation status response:', response)

    const responseData = response as any
    const tasksWithAnnotations = responseData.data?.tasksWithAnnotations || []
    const tasksWithoutAnnotations = responseData.data?.tasksWithoutAnnotations || []
    const annotationCounts = responseData.data?.annotationCounts || {}

    // Show detailed results
    const totalCompleted = tasks.value.completed.length
    const withAnnotations = tasksWithAnnotations.length
    const withoutAnnotations = tasksWithoutAnnotations.length

    console.log('Annotation analysis:', {
      totalCompleted,
      withAnnotations,
      withoutAnnotations,
      annotationCounts
    })

    let message = `Checked ${totalCompleted} completed tasks:\n`
    message += `• ${withAnnotations} tasks have annotations\n`
    message += `• ${withoutAnnotations} tasks have no annotations`

    if (withoutAnnotations > 0) {
      message += `\n\nTasks without annotations: ${tasksWithoutAnnotations.join(', ')}`
    }

    if (Object.keys(annotationCounts).length > 0) {
      message += '\n\nAnnotation counts:'
      Object.entries(annotationCounts).forEach(([taskId, count]) => {
        message += `\n• Task ${taskId}: ${count} annotations`
      })
    }

    toast.add({
      title: withoutAnnotations > 0 ? 'Annotation Issues Found' : 'All Tasks Have Annotations',
      description: message,
      color: withoutAnnotations > 0 ? 'warning' : 'success'
    })

  } catch (err) {
    console.error('Error checking annotation status:', err)
    toast.add({
      title: 'Check Failed',
      description: err instanceof Error ? err.message : 'Failed to check annotation status',
      color: 'error'
    })
  } finally {
    checkingAnnotations.value = false
  }
}

// Dataset split management
const updateSplitPercentages = (changedType: 'train' | 'test' | 'validation') => {
  // Ensure values don't go below 0 or above 100
  trainPercentage.value = Math.max(0, Math.min(100, trainPercentage.value))
  testPercentage.value = Math.max(0, Math.min(100, testPercentage.value))
  validationPercentage.value = Math.max(0, Math.min(100, validationPercentage.value))
  
  // Auto-adjust other percentages if total exceeds 100
  const total = trainPercentage.value + testPercentage.value + validationPercentage.value
  if (total > 100) {
    const excess = total - 100
    if (changedType === 'train') {
      // Reduce test and validation proportionally
      const remaining = testPercentage.value + validationPercentage.value
      if (remaining > 0) {
        const testRatio = testPercentage.value / remaining
        const validationRatio = validationPercentage.value / remaining
        testPercentage.value = Math.max(0, testPercentage.value - (excess * testRatio))
        validationPercentage.value = Math.max(0, validationPercentage.value - (excess * validationRatio))
      }
    } else if (changedType === 'test') {
      // Reduce train and validation proportionally
      const remaining = trainPercentage.value + validationPercentage.value
      if (remaining > 0) {
        const trainRatio = trainPercentage.value / remaining
        const validationRatio = validationPercentage.value / remaining
        trainPercentage.value = Math.max(0, trainPercentage.value - (excess * trainRatio))
        validationPercentage.value = Math.max(0, validationPercentage.value - (excess * validationRatio))
      }
    } else if (changedType === 'validation') {
      // Reduce train and test proportionally
      const remaining = trainPercentage.value + testPercentage.value
      if (remaining > 0) {
        const trainRatio = trainPercentage.value / remaining
        const testRatio = testPercentage.value / remaining
        trainPercentage.value = Math.max(0, trainPercentage.value - (excess * trainRatio))
        testPercentage.value = Math.max(0, testPercentage.value - (excess * testRatio))
      }
    }
  }
}

// Watchers
watch(userPermissions, (newValue, oldValue) => {
  console.log('User permissions changed from', oldValue, 'to', newValue)
  console.log('Permission level changed to:', permissionLevelLabel.value)
}, { immediate: true, deep: true })

// Lifecycle
onMounted(async () => {
  console.log('Component mounted, initial permissions:', userPermissions.value)
  // Fetch project data first to get organizationId, then fetch tasks
  await fetchProjectData()
  await fetchTasks()
})

// Watch for project ID changes
watch(() => props.projectId, () => {
  if (props.projectId) {
    // Reset permission state for smooth transitions between projects
    permissionsLoading.value = true
    userPermissions.value = {
      isOrgAdmin: false,
      canEditProject: false,
      canAssignTasks: false,
      canViewAllTasks: false,
      canExportDataset: false
    }
    
    // Clear selections when switching projects
    selectedUnassignedTasks.value = []
    selectedAnnotatingTasks.value = []
    selectedCompletedTasks.value = []
    // Reset export settings when switching projects
    selectedExportFormat.value = 'yolo'
    trainPercentage.value = 80
    testPercentage.value = 10
    validationPercentage.value = 10
    fetchTasks()
  }
}, { immediate: true })
</script>
