import { computed, reactive } from 'vue';
import { DEFAULTS } from '../constants/model';
import { simulate } from '../core/simulation';
import { buildViewModel } from '../core/viewModel';

/**
 * 模拟器的全部状态与派生数据。
 * 参数是响应式对象：任何滑杆一动，computed 自动重算曲线，视图无需手动触发渲染。
 */
export function useSimulation(overrides = {}) {
  const params = reactive({ ...DEFAULTS, ...overrides });

  const simulation = computed(() => simulate(params));
  const view = computed(() => buildViewModel(simulation.value, params));

  /** 恢复默认参数。 */
  function reset() {
    Object.assign(params, DEFAULTS);
  }

  return { params, simulation, view, reset };
}
